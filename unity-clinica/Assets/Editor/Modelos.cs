using System.Linq;
using UnityEditor.Animations;
using UnityEditor;
using UnityEngine;

/// <summary>Inspecciona y ajusta los modelos importados de Meshy.</summary>
public static class Modelos
{
    const string Carpeta = "Assets/Modelos";

    public static void Inspeccionar()
    {
        foreach (var guid in AssetDatabase.FindAssets("t:Model", new[] { Carpeta }))
        {
            var ruta = AssetDatabase.GUIDToAssetPath(guid);
            Debug.Log("MODELO: " + ruta);

            var mallas = AssetDatabase.LoadAllAssetsAtPath(ruta).OfType<Mesh>().ToArray();
            int tris = mallas.Sum(m => m.triangles.Length / 3);
            int huesos = mallas.Sum(m => m.bindposes != null ? m.bindposes.Length : 0);
            Debug.Log("  MALLAS: " + mallas.Length + " · TRIANGULOS: " + tris + " · HUESOS: " + huesos);

            var clips = AssetDatabase.LoadAllAssetsAtPath(ruta).OfType<AnimationClip>()
                        .Where(c => !c.name.StartsWith("__preview")).ToArray();
            Debug.Log("  CLIPS: " + clips.Length);
            foreach (var c in clips)
                Debug.Log("    CLIP: '" + c.name + "' · " + c.length.ToString("0.00") + "s · loop=" + c.isLooping);
        }

        foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { Carpeta }))
        {
            var ruta = AssetDatabase.GUIDToAssetPath(guid);
            var t = AssetDatabase.LoadAssetAtPath<Texture2D>(ruta);
            if (t != null) Debug.Log("  TEXTURA: " + System.IO.Path.GetFileName(ruta) + " · " + t.width + "x" + t.height);
        }
    }

    /// <summary>Baja el peso de las texturas y deja las animaciones en bucle.
    /// Meshy exporta a 2048 y sin loop; para WebGL eso es carísimo y el
    /// caminado se cortaría en seco.</summary>
    public static void Ajustar()
    {
        foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { Carpeta }))
        {
            var ruta = AssetDatabase.GUIDToAssetPath(guid);
            var ti = AssetImporter.GetAtPath(ruta) as TextureImporter;
            if (ti == null) continue;
            ti.maxTextureSize = ruta.Contains("_normal") ? 512 : 1024;
            ti.textureCompression = TextureImporterCompression.Compressed;
            if (ruta.Contains("_normal")) ti.textureType = TextureImporterType.NormalMap;
            ti.SaveAndReimport();
            Debug.Log("AJUSTADA: " + System.IO.Path.GetFileName(ruta) + " -> " + ti.maxTextureSize);
        }

        foreach (var guid in AssetDatabase.FindAssets("t:Model", new[] { Carpeta }))
        {
            var ruta = AssetDatabase.GUIDToAssetPath(guid);
            var mi = AssetImporter.GetAtPath(ruta) as ModelImporter;
            if (mi == null) continue;
            mi.animationType = ModelImporterAnimationType.Generic;
            mi.importAnimation = true;
            mi.meshCompression = ModelImporterMeshCompression.High;
            mi.isReadable = false;
            mi.optimizeMeshPolygons = true;
            mi.optimizeMeshVertices = true;

            var clips = mi.defaultClipAnimations;
            for (int i = 0; i < clips.Length; i++)
            {
                var n = clips[i].name.ToLower();
                clips[i].loopTime = n.Contains("walk") || n.Contains("run");
            }
            if (clips.Length > 0) mi.clipAnimations = clips;
            mi.SaveAndReimport();
            Debug.Log("MODELO AJUSTADO: " + ruta);
        }
        AssetDatabase.Refresh();
    }

    /// <summary>Crea el prefab que el juego carga en runtime.</summary>
    public static void CrearPrefabKine()
    {
        Ajustar();
        var guid = AssetDatabase.FindAssets("t:Model", new[] { Carpeta }).FirstOrDefault();
        if (guid == null) { Debug.LogError("No hay modelo"); return; }
        var ruta = AssetDatabase.GUIDToAssetPath(guid);
        var fbx = AssetDatabase.LoadAssetAtPath<GameObject>(ruta);
        if (fbx == null) { Debug.LogError("No cargó el FBX"); return; }

        System.IO.Directory.CreateDirectory("Assets/Resources");
        var inst = (GameObject)PrefabUtility.InstantiatePrefab(fbx);
        inst.name = "Kine";

        // Ojo: ?? NO sirve con objetos de Unity (el null es falso, sobrecargan ==)
        var anim = inst.GetComponent<Animator>();
        if (anim == null) anim = inst.AddComponent<Animator>();
        var clips = AssetDatabase.LoadAllAssetsAtPath(ruta).OfType<AnimationClip>()
                    .Where(c => !c.name.StartsWith("__preview")).ToArray();
        var caminar = clips.FirstOrDefault(c => c.name.ToLower().Contains("walk"));
        if (caminar != null)
        {
            var ctrl = UnityEditor.Animations.AnimatorController
                .CreateAnimatorControllerAtPathWithClip("Assets/Resources/KineCtrl.controller", caminar);
            anim.runtimeAnimatorController = ctrl;
            Debug.Log("CONTROLADOR con clip: " + caminar.name);
        }

        var mat = MaterialDeMeshy();
        foreach (var r in inst.GetComponentsInChildren<Renderer>(true))
        {
            var mats = new Material[r.sharedMaterials.Length];
            for (int i = 0; i < mats.Length; i++) mats[i] = mat;
            r.sharedMaterials = mats;
        }
        PrefabUtility.SaveAsPrefabAsset(inst, "Assets/Resources/Kine.prefab");
        Object.DestroyImmediate(inst);
        Debug.Log("PREFAB CREADO: Assets/Resources/Kine.prefab");
    }

    /// <summary>Meshy exporta el FBX sin enlazar las texturas, así que Unity
    /// lo importa en blanco puro. Acá se arma el material a mano y se le pega
    /// a todos los renderers del prefab.</summary>
    static Material MaterialDeMeshy()
    {
        Texture2D Buscar(string sufijo)
        {
            foreach (var g in AssetDatabase.FindAssets("t:Texture2D", new[] { Carpeta }))
            {
                var r = AssetDatabase.GUIDToAssetPath(g);
                var nom = System.IO.Path.GetFileNameWithoutExtension(r);
                if (sufijo == "" && !nom.Contains("_normal") && !nom.Contains("_roughness") && !nom.Contains("_metallic"))
                    return AssetDatabase.LoadAssetAtPath<Texture2D>(r);
                if (sufijo != "" && nom.EndsWith(sufijo))
                    return AssetDatabase.LoadAssetAtPath<Texture2D>(r);
            }
            return null;
        }

        var sh = Shader.Find("Universal Render Pipeline/Lit");
        if (sh == null) sh = Shader.Find("Standard");
        var mat = new Material(sh);
        var albedo = Buscar("");
        var normal = Buscar("_normal");
        if (albedo != null) { mat.mainTexture = albedo; mat.SetTexture("_BaseMap", albedo); }
        if (normal != null)
        {
            mat.EnableKeyword("_NORMALMAP");
            mat.SetTexture("_BumpMap", normal);
            mat.SetTexture("_NormalMap", normal);
        }
        mat.SetFloat("_Smoothness", 0.15f);
        mat.SetFloat("_Glossiness", 0.15f);
        AssetDatabase.CreateAsset(mat, "Assets/Resources/KineMat.mat");
        Debug.Log("MATERIAL: albedo=" + (albedo != null ? albedo.name : "NO") + " normal=" + (normal != null ? "si" : "NO"));
        return mat;
    }
}

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
            // NADA de compresión en mallas con esqueleto: cuantiza las posiciones
            // y deforma el modelo hasta volverlo irreconocible. Fue la causa de que
            // los personajes salieran como manchas gigantes.
            mi.meshCompression = ModelImporterMeshCompression.Off;
            mi.isReadable = false;

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

    /// Qué modelo es quién. La clave es un trozo del nombre del archivo.
    /// PENDIENTE: los export "Meshy_Merged_Animations" deforman la malla hasta
    /// volverla una mancha gigante al aplicarles su Animator. Se probó sin
    /// resultado: normalizar escala, apagar/encender root motion y quitar la
    /// compresión de malla. El export "withSkin" (Nurse) funciona perfecto, así
    /// que la sospecha es que los clips fusionados traen un esqueleto que no
    /// calza con el avatar del modelo.
    /// Hasta resolverlo solo se usa el que funciona; el resto cae a primitivas.
    static readonly (string clave, string prefab, bool kine)[] Reparto = {
        ("Catalina_Rojas", "Kine0",     true),
        ("Gaucho",         "Paciente0", false),
    };

    /// Qué papel cumple cada animación, según el nombre del archivo.
    static string EstadoDe(string ruta)
    {
        if (ruta.Contains("Walking")) return "caminar";
        if (ruta.Contains("Lie_Down") || ruta.Contains("Lie_on_Chair")) return "acostado";
        if (ruta.Contains("situps") || ruta.Contains("Burpee")) return "ejercicio";
        return "quieto";   // los de nombre UUID: idle / atendiendo al paciente
    }

    static Material MaterialPara(string carpetaModelo, string nombrePrefab)
    {
        Texture2D Buscar(string suf)
        {
            foreach (var g in AssetDatabase.FindAssets("t:Texture2D", new[] { carpetaModelo }))
            {
                var r = AssetDatabase.GUIDToAssetPath(g);
                var n = System.IO.Path.GetFileNameWithoutExtension(r);
                bool esMapa = n.Contains("_normal") || n.Contains("_roughness") || n.Contains("_metallic");
                if (suf == "" && !esMapa) return AssetDatabase.LoadAssetAtPath<Texture2D>(r);
                if (suf != "" && n.EndsWith(suf)) return AssetDatabase.LoadAssetAtPath<Texture2D>(r);
            }
            return null;
        }
        var sh = Shader.Find("Universal Render Pipeline/Lit");
        if (sh == null) sh = Shader.Find("Standard");
        var mat = new Material(sh);
        var alb = Buscar(""); var nor = Buscar("_normal");
        if (alb != null) { mat.mainTexture = alb; mat.SetTexture("_BaseMap", alb); }
        if (nor != null) { mat.EnableKeyword("_NORMALMAP"); mat.SetTexture("_BumpMap", nor); mat.SetTexture("_NormalMap", nor); }
        mat.SetFloat("_Smoothness", 0.15f);
        mat.SetFloat("_Glossiness", 0.15f);
        AssetDatabase.CreateAsset(mat, "Assets/Resources/" + nombrePrefab + "Mat.mat");
        return mat;
    }

    /// <summary>Arma un prefab por cada modelo, con su material y su clip.</summary>
    public static void CrearTodosLosPrefabs()
    {
        Ajustar();
        System.IO.Directory.CreateDirectory("Assets/Resources");

        foreach (var reparto in Reparto)
        {
            // todos los FBX de este personaje (uno por animación)
            var rutas = AssetDatabase.FindAssets("t:Model", new[] { Carpeta })
                .Select(AssetDatabase.GUIDToAssetPath)
                .Where(r => r.Contains(reparto.clave))
                .OrderBy(r => r).ToArray();
            if (rutas.Length == 0) { Debug.Log("SIN ARCHIVOS: " + reparto.clave); continue; }

            // el modelo base puede ser cualquiera; todos traen la malla con piel
            var baseRuta = rutas.FirstOrDefault(r => r.Contains("Walking")) ?? rutas[0];
            var fbx = AssetDatabase.LoadAssetAtPath<GameObject>(baseRuta);
            if (fbx == null) continue;

            var inst = (GameObject)PrefabUtility.InstantiatePrefab(fbx);
            inst.name = reparto.prefab;
            var anim = inst.GetComponent<Animator>();
            if (anim == null) anim = inst.AddComponent<Animator>();
            anim.applyRootMotion = true;

            // un controlador con un estado por papel
            var ctrl = UnityEditor.Animations.AnimatorController.CreateAnimatorControllerAtPath(
                "Assets/Resources/" + reparto.prefab + "Ctrl.controller");
            var maquina = ctrl.layers[0].stateMachine;
            var puestos = new System.Collections.Generic.HashSet<string>();

            foreach (var r in rutas)
            {
                var estado = EstadoDe(r);
                if (puestos.Contains(estado)) continue;
                var clip = AssetDatabase.LoadAllAssetsAtPath(r).OfType<AnimationClip>()
                           .FirstOrDefault(c => !c.name.StartsWith("__preview"));
                if (clip == null) continue;
                var st = maquina.AddState(estado);
                st.motion = clip;
                if (estado == "quieto") maquina.defaultState = st;
                puestos.Add(estado);
                Debug.Log("  ESTADO '" + estado + "' <- " + System.IO.Path.GetFileName(r));
            }
            if (puestos.Count == 0) { Object.DestroyImmediate(inst); continue; }
            anim.runtimeAnimatorController = ctrl;

            var carpetaModelo = System.IO.Path.GetDirectoryName(baseRuta).Replace("\\", "/");
            var mat = MaterialPara(carpetaModelo, reparto.prefab);
            foreach (var rd in inst.GetComponentsInChildren<Renderer>(true))
            {
                var ms = new Material[rd.sharedMaterials.Length];
                for (int i = 0; i < ms.Length; i++) ms[i] = mat;
                rd.sharedMaterials = ms;
            }

            float alto = 0f;
            foreach (var smr in inst.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (smr.sharedMesh != null) alto = Mathf.Max(alto, smr.sharedMesh.bounds.size.y);
            if (alto > 0.01f) inst.transform.localScale = Vector3.one * (1.75f / alto);

            PrefabUtility.SaveAsPrefabAsset(inst, "Assets/Resources/" + reparto.prefab + ".prefab");
            Object.DestroyImmediate(inst);
            Debug.Log("PREFAB: " + reparto.prefab + " · estados: " + string.Join(",", puestos));
        }
    }

    /// <summary>Mide cada prefab para saber si queda de pie o acostado.</summary>
    public static void Diagnostico()
    {
        foreach (var nom in new[] { "Kine0", "Kine1", "Kine2", "Paciente0", "Paciente1", "Paciente2" })
        {
            var pf = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + nom + ".prefab");
            if (pf == null) { Debug.Log("DIAG " + nom + ": NO EXISTE"); continue; }
            var inst = (GameObject)PrefabUtility.InstantiatePrefab(pf);
            var rends = inst.GetComponentsInChildren<Renderer>(true);
            if (rends.Length == 0) { Debug.Log("DIAG " + nom + ": sin renderers"); Object.DestroyImmediate(inst); continue; }
            var b = rends[0].bounds;
            for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
            var anim = inst.GetComponentInChildren<Animator>();
            var ctrl = anim != null ? anim.runtimeAnimatorController : null;
            Debug.Log("DIAG " + nom
                + " | alto=" + b.size.y.ToString("0.00")
                + " ancho=" + b.size.x.ToString("0.00")
                + " fondo=" + b.size.z.ToString("0.00")
                + " | " + (b.size.y > b.size.z ? "DE PIE" : "ACOSTADO")
                + " | rotRaiz=" + inst.transform.localRotation.eulerAngles
                + " | clip=" + (ctrl != null && ctrl.animationClips.Length > 0 ? ctrl.animationClips[0].name : "sin controlador"));
            Object.DestroyImmediate(inst);
        }
    }
}

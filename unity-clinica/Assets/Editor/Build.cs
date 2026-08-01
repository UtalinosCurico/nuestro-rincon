using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Build desde la terminal, sin abrir el editor. La escena también se crea
/// acá por código: así no hay ningún .unity escrito a mano que se pueda
/// corromper, y el build es reproducible.
/// Uso: Unity -batchmode -quit -executeMethod Build.WebGL
/// </summary>
public static class Build
{
    const string RutaEscena = "Assets/Escenas/Clinica.unity";

    [MenuItem("Clinica/Crear escena")]
    public static void CrearEscena()
    {
        var esc = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var go = new GameObject("Clinica");        // el nombre importa: SendMessage apunta acá
        go.AddComponent<Clinica>();
        System.IO.Directory.CreateDirectory("Assets/Escenas");
        EditorSceneManager.SaveScene(esc, RutaEscena);
        AssetDatabase.Refresh();
        Debug.Log("Escena creada en " + RutaEscena);
    }


    /// <summary>
    /// En un build, Unity descarta los shaders que ningún material del
    /// proyecto referencia. Como acá los materiales se crean por código con
    /// Shader.Find, el shader se eliminaba y el juego salía en negro con
    /// ArgumentNullException. Declararlo siempre-incluido lo resuelve.
    /// </summary>
    static void AsegurarShaderIncluido(string nombre)
    {
        var sh = Shader.Find(nombre);
        if (sh == null) { Debug.LogWarning("No existe el shader " + nombre); return; }
        var activos = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset");
        if (activos == null || activos.Length == 0) return;
        var so = new SerializedObject(activos[0]);
        var arr = so.FindProperty("m_AlwaysIncludedShaders");
        for (int i = 0; i < arr.arraySize; i++)
            if (arr.GetArrayElementAtIndex(i).objectReferenceValue == sh) return;
        arr.InsertArrayElementAtIndex(arr.arraySize);
        arr.GetArrayElementAtIndex(arr.arraySize - 1).objectReferenceValue = sh;
        so.ApplyModifiedProperties();
        AssetDatabase.SaveAssets();
        Debug.Log("Shader incluido en el build: " + nombre);
    }

    public static void WebGL()
    {
        AsegurarShaderIncluido("Standard");
        AsegurarShaderIncluido("Universal Render Pipeline/Lit");
        CrearEscena();

        PlayerSettings.companyName = "Catalina y Diego";
        PlayerSettings.productName = "Clinica Kinesica";
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.WebGL.template = "PROJECT:Movil";   // plantilla propia: pantalla completa en celular
        PlayerSettings.runInBackground = false;
        PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { UnityEngine.Rendering.GraphicsDeviceType.OpenGLES3 });
        PlayerSettings.stripEngineCode = true;
        // Low + link.xml: con High se eliminaban los colliders que CreatePrimitive necesita
        PlayerSettings.SetManagedStrippingLevel(UnityEditor.Build.NamedBuildTarget.WebGL, ManagedStrippingLevel.Low);

        var opciones = new BuildPlayerOptions
        {
            scenes = new[] { RutaEscena },
            locationPathName = "Build/webgl",
            target = BuildTarget.WebGL,
            options = BuildOptions.None,
        };

        var reporte = BuildPipeline.BuildPlayer(opciones);
        var r = reporte.summary;
        Debug.Log("RESULTADO_BUILD: " + r.result + " · " + (r.totalSize / 1024 / 1024) + " MB · " + r.totalTime);
        if (r.result != BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}

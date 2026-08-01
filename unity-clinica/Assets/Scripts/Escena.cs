using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Construye la clínica entera por código: piso, muros, camillas, equipos y
/// gente. Se hace así a propósito y no armando la escena a mano en el editor,
/// porque el .unity es YAML con GUIDs y es muy fácil corromperlo; el C# se
/// puede leer y corregir. Además la escena se ve armarse sola al dar Play.
/// </summary>
public static class Escena
{
    // ---- paleta, la misma de la versión web para que se reconozca ----
    public static readonly Color Piso     = Col(0xcdbfae);   // más oscuro: recibe el sol de lleno y se quemaba a blanco
    public static readonly Color Muro     = Col(0xe9e2d6);
    public static readonly Color MuroBajo = Col(0xdcd3c6);
    public static readonly Color Camilla  = Col(0xfdfbf7);
    public static readonly Color Patas    = Col(0xa6b2ae);
    public static readonly Color Sabana   = Col(0xbfd8e4);
    public static readonly Color Piel     = Col(0xe8c3a0);
    public static readonly Color Pelo     = Col(0x4a3b33);
    public static readonly Color Tunica   = Col(0x7fae96);
    public static readonly Color Parche   = Col(0x1f4e79);
    public static readonly Color Mueble   = Col(0xd8c3a5);
    public static readonly Color Planta   = Col(0x6f9c5a);
    public static readonly Color Macetero = Col(0xc98f6d);

    public static readonly Color[] Ropa = {
        Col(0xc8956d), Col(0x6d9fc8), Col(0xc86d8f), Col(0x9b7fc8), Col(0xd8b45f)
    };

    static Color Col(int hex) => new Color(
        ((hex >> 16) & 0xFF) / 255f, ((hex >> 8) & 0xFF) / 255f, (hex & 0xFF) / 255f);

    static Material _base;
    /// <summary>Un material por color, reutilizado. Crear uno por objeto es
    /// lo que hace que estos juegos se arrastren en celular.</summary>
    static readonly Dictionary<Color, Material> _cache = new Dictionary<Color, Material>();
    public static Material Mat(Color c)
    {
        if (_cache.TryGetValue(c, out var m)) return m;
        if (_base == null)
        {
            // mismo motivo: nada de ?? con objetos de Unity
            var sh = Shader.Find("Universal Render Pipeline/Lit");
            if (sh == null) sh = Shader.Find("Standard");
            _base = new Material(sh);
        }
        m = new Material(_base) { color = c };
        m.SetFloat("_Smoothness", 0.08f);
        m.SetFloat("_Glossiness", 0.08f);
        _cache[c] = m;
        return m;
    }

    public static GameObject Caja(Transform padre, string nom, Vector3 pos, Vector3 tam, Color color)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
        g.name = nom;
        Object.Destroy(g.GetComponent<Collider>());   // no hace falta física
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        g.transform.localScale = tam;
        g.GetComponent<Renderer>().sharedMaterial = Mat(color);
        return g;
    }

    public static GameObject Cilindro(Transform padre, string nom, Vector3 pos, float radio, float alto, Color color)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        g.name = nom;
        Object.Destroy(g.GetComponent<Collider>());
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        g.transform.localScale = new Vector3(radio * 2f, alto * 0.5f, radio * 2f);
        g.GetComponent<Renderer>().sharedMaterial = Mat(color);
        return g;
    }

    public static GameObject Esfera(Transform padre, string nom, Vector3 pos, float radio, Color color)
    {
        var g = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        g.name = nom;
        Object.Destroy(g.GetComponent<Collider>());
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        g.transform.localScale = Vector3.one * (radio * 2f);
        g.GetComponent<Renderer>().sharedMaterial = Mat(color);
        return g;
    }

    // Planta de la clínica: tres boxes al fondo, cada uno con su puerta, y un
    // pasillo por delante por donde entra la gente. Así no se ve todo el mundo
    // amontonado en una sola sala.
    public const float BoxZ = -2.6f;          // centro de los boxes
    public const float FrenteBoxes = -0.6f;   // pared con las puertas
    public static readonly float[] BoxX = { -4.2f, -1.3f, 1.6f };

    /// <summary>Un muro con vanos (puertas) donde se le indique.</summary>
    static void MuroConVanos(Transform raiz, string nom, float z, float x0, float x1, float[] puertas, float ancho)
    {
        var cortes = new System.Collections.Generic.List<float> { x0 };
        foreach (var p in puertas) { cortes.Add(p - ancho / 2f); cortes.Add(p + ancho / 2f); }
        cortes.Add(x1);
        for (int i = 0; i + 1 < cortes.Count; i += 2)
        {
            float a = cortes[i], b = cortes[i + 1];
            if (b - a < 0.05f) continue;
            Caja(raiz, nom, new Vector3((a + b) / 2f, 1.2f, z), new Vector3(b - a, 2.4f, 0.16f), MuroBajo);
        }
    }

    public static void ConstruirSala(Transform raiz)
    {
        Caja(raiz, "Piso",      new Vector3(0f, -0.1f, 0f),   new Vector3(13f, 0.2f, 10f), Piso);
        Caja(raiz, "MuroFondo", new Vector3(0f, 1.6f, -4.6f), new Vector3(13f, 3.2f, 0.2f), Muro);
        Caja(raiz, "MuroIzq",   new Vector3(-6.5f, 1.6f, 0f), new Vector3(0.2f, 3.2f, 10f), MuroBajo);

        // muro derecho con la puerta de entrada
        Caja(raiz, "MuroDer-A", new Vector3(6.5f, 1.6f, -2.6f), new Vector3(0.2f, 3.2f, 4.8f), MuroBajo);
        Caja(raiz, "MuroDer-B", new Vector3(6.5f, 1.6f, 3.4f),  new Vector3(0.2f, 3.2f, 3.2f), MuroBajo);
        Caja(raiz, "Dintel",    new Vector3(6.5f, 2.7f, 0.6f),  new Vector3(0.2f, 1f, 2.8f), MuroBajo);

        // tabiques que separan los tres boxes
        foreach (var x in new[] { -5.7f, -2.75f, 0.15f, 3.05f })
            Caja(raiz, "Tabique", new Vector3(x, 1.2f, BoxZ), new Vector3(0.16f, 2.4f, 4f), MuroBajo);

        // frente de los boxes, con una puerta por box
        MuroConVanos(raiz, "FrenteBox", FrenteBoxes, -5.7f, 3.05f, BoxX, 1.2f);

        Caja(raiz, "Ventanal", new Vector3(-3f, 1.9f, -4.47f), new Vector3(3.2f, 1.4f, 0.06f), Col(0xbfe0f0));
        Caja(raiz, "Recepcion", new Vector3(4.8f, 0.48f, 3.6f), new Vector3(2.6f, 0.95f, 0.7f), Mueble);

        CrearPlanta(raiz, new Vector3(5.8f, 0f, 1.2f));
        CrearPlanta(raiz, new Vector3(-6f, 0f, 3.4f));
    }

    public static GameObject CrearPlanta(Transform padre, Vector3 pos)
    {
        var g = new GameObject("Planta");
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        Cilindro(g.transform, "Macetero", new Vector3(0f, 0.13f, 0f), 0.16f, 0.26f, Macetero);
        for (int i = 0; i < 5; i++)
        {
            var h = Esfera(g.transform, "Hoja",
                new Vector3(Random.Range(-0.11f, 0.11f), 0.36f + Random.Range(0f, 0.22f), Random.Range(-0.11f, 0.11f)),
                Random.Range(0.10f, 0.17f), Planta);
        }
        return g;
    }

    public static GameObject CrearCamilla(Transform padre, Vector3 pos)
    {
        var g = new GameObject("Camilla");
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        Caja(g.transform, "Base",  new Vector3(0f, 0.66f, 0f),   new Vector3(0.78f, 0.12f, 1.9f), Camilla);
        Caja(g.transform, "Sabana",new Vector3(0f, 0.73f, 0.3f), new Vector3(0.8f, 0.04f, 1.2f), Sabana);
        float[] xs = { -0.32f, 0.32f }, zs = { -0.8f, 0.8f };
        foreach (var x in xs) foreach (var z in zs)
            Cilindro(g.transform, "Pata", new Vector3(x, 0.3f, z), 0.035f, 0.6f, Patas);
        return g;
    }
}

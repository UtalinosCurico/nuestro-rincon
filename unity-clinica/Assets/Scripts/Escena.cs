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

    /// <summary>Sala: piso, dos muros, ventanal, mesón y plantas.</summary>
    public static void ConstruirSala(Transform raiz)
    {
        Caja(raiz, "Piso",     new Vector3(0f, -0.1f, 0.6f),  new Vector3(12f, 0.2f, 11f), Piso);
        Caja(raiz, "MuroFondo",new Vector3(0f, 1.6f, -4.9f),  new Vector3(12f, 3.2f, 0.2f), Muro);
        Caja(raiz, "MuroIzq",  new Vector3(-6f, 1.6f, 0.6f),  new Vector3(0.2f, 3.2f, 11f), MuroBajo);
        Caja(raiz, "MuroDer",  new Vector3(6f, 1.6f, 0.6f),   new Vector3(0.2f, 3.2f, 11f), MuroBajo);

        // Tabique que separa la zona de boxes (atrás) de la sala de espera
        // (adelante), con un vano para pasar.
        Caja(raiz, "Tabique-Izq", new Vector3(-3.9f, 1.1f, 0.9f), new Vector3(4.2f, 2.2f, 0.16f), MuroBajo);
        Caja(raiz, "Tabique-Der", new Vector3(3.9f, 1.1f, 0.9f),  new Vector3(4.2f, 2.2f, 0.16f), MuroBajo);
        Caja(raiz, "Dintel",      new Vector3(0f, 2.3f, 0.9f),    new Vector3(3.6f, 0.6f, 0.16f), MuroBajo);

        var vent = Caja(raiz, "Ventanal", new Vector3(-1.5f, 1.9f, -4.77f), new Vector3(3.4f, 1.5f, 0.06f), Col(0xbfe0f0));
        vent.GetComponent<Renderer>().sharedMaterial = Mat(Col(0xbfe0f0));

        Caja(raiz, "MesonRecepcion", new Vector3(4.3f, 0.48f, 2.2f), new Vector3(2.4f, 0.95f, 0.7f), Mueble);
        CrearSalaEspera(raiz);

        CrearPlanta(raiz, new Vector3(-5.2f, 0f, -3.8f));
        CrearPlanta(raiz, new Vector3(5.2f, 0f, 4.6f));
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

    /// <summary>Box de atención: mamparas a los lados de la camilla, abiertas
    /// al frente, como en una clínica de verdad.</summary>
    public static GameObject CrearBox(Transform padre, Vector3 pos)
    {
        var g = new GameObject("Box");
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        Caja(g.transform, "MamparaIzq", new Vector3(-1.15f, 0.95f, 0f), new Vector3(0.12f, 1.9f, 2.6f), MuroBajo);
        Caja(g.transform, "MamparaDer", new Vector3(1.15f, 0.95f, 0f),  new Vector3(0.12f, 1.9f, 2.6f), MuroBajo);
        Caja(g.transform, "Cenefa",     new Vector3(0f, 1.95f, -1.24f), new Vector3(2.4f, 0.14f, 0.14f), Col(0x7fae96));
        return g;
    }

    /// <summary>Sala de espera: filas de sillas y una mesita.</summary>
    public static void CrearSalaEspera(Transform raiz)
    {
        var g = new GameObject("SalaEspera");
        g.transform.SetParent(raiz, false);
        for (int fila = 0; fila < 2; fila++)
        {
            for (int i = 0; i < 4; i++)
            {
                var x = -4.2f + i * 1.15f;
                var z = 2.6f + fila * 1.7f;
                Caja(g.transform, "Asiento",  new Vector3(x, 0.42f, z),        new Vector3(0.6f, 0.1f, 0.55f), Col(0x8fa8b8));
                Caja(g.transform, "Respaldo", new Vector3(x, 0.68f, z + 0.26f),new Vector3(0.6f, 0.55f, 0.1f), Col(0x8fa8b8));
                Cilindro(g.transform, "PataA", new Vector3(x - 0.22f, 0.2f, z - 0.2f), 0.03f, 0.42f, Patas);
                Cilindro(g.transform, "PataB", new Vector3(x + 0.22f, 0.2f, z - 0.2f), 0.03f, 0.42f, Patas);
            }
        }
        Caja(g.transform, "Mesita", new Vector3(0.6f, 0.35f, 4.8f), new Vector3(1.1f, 0.08f, 0.6f), Mueble);
    }
}

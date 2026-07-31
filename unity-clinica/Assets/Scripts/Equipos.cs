using UnityEngine;

/// <summary>Cada equipo que se compra tiene su modelo, y aparece en la sala
/// apenas se compra. Es lo que pidió Diego: que la clínica se vea crecer.</summary>
public static class Equipos
{
    public static GameObject Crear(Transform padre, string id)
    {
        switch (id)
        {
            case "tens":       return TENS(padre,        new Vector3( 2.55f, 0f, -1.2f), -30f);
            case "eco":        return Ecografo(padre,     new Vector3(-3.35f, 0f, -0.9f),  40f);
            case "gym":        return Gimnasio(padre,     new Vector3( 2.30f, 0f,  1.4f), -20f);
            case "plataforma": return Plataforma(padre,   new Vector3(-3.30f, 0f,  0.9f),  28f);
            case "hidro":      return Hidro(padre,        new Vector3( 1.90f, 0f,  2.6f), -14f);
            default:           return null;   // camilla2/camilla3 sí suman salas, no modelo propio
        }
    }

    static GameObject Raiz(Transform padre, string nom, Vector3 pos, float rotY)
    {
        var g = new GameObject(nom);
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;
        g.transform.localRotation = Quaternion.Euler(0f, rotY, 0f);
        return g;
    }

    static GameObject Ecografo(Transform padre, Vector3 pos, float rotY)
    {
        var g = Raiz(padre, "Ecografo", pos, rotY);
        Escena.Caja(g.transform, "Carro",    new Vector3(0f, 0.42f, 0f),  new Vector3(0.42f, 0.6f, 0.36f), new Color(0.93f, 0.95f, 0.96f));
        Escena.Caja(g.transform, "Pantalla", new Vector3(0f, 0.88f, 0f),  new Vector3(0.4f, 0.3f, 0.05f),  new Color(0.18f, 0.28f, 0.35f));
        Escena.Caja(g.transform, "Brillo",   new Vector3(0f, 0.88f, 0.04f), new Vector3(0.33f, 0.22f, 0.01f), new Color(0.5f, 0.83f, 0.91f));
        return g;
    }

    static GameObject TENS(Transform padre, Vector3 pos, float rotY)
    {
        var g = Raiz(padre, "TENS", pos, rotY);
        Escena.Caja(g.transform, "Mesa",  new Vector3(0f, 0.62f, 0f), new Vector3(0.44f, 0.06f, 0.34f), Escena.Mueble);
        Escena.Caja(g.transform, "Equipo",new Vector3(0f, 0.72f, 0f), new Vector3(0.26f, 0.14f, 0.2f),  new Color(0.95f, 0.91f, 0.85f));
        Escena.Caja(g.transform, "Luz",   new Vector3(0f, 0.74f, 0.11f), new Vector3(0.05f, 0.05f, 0.01f), new Color(0.5f, 0.83f, 0.56f));
        return g;
    }

    static GameObject Gimnasio(Transform padre, Vector3 pos, float rotY)
    {
        var g = Raiz(padre, "Gimnasio", pos, rotY);
        Escena.Caja(g.transform, "Colchoneta", new Vector3(0f, 0.03f, 0.5f), new Vector3(1.1f, 0.06f, 0.7f), new Color(0.43f, 0.62f, 0.78f));
        Escena.Caja(g.transform, "Rack",       new Vector3(0f, 0.25f, -0.35f), new Vector3(0.8f, 0.5f, 0.26f), Escena.Mueble);
        for (int i = 0; i < 3; i++)
        {
            float x = -0.24f + i * 0.24f;
            Escena.Cilindro(g.transform, "Disco", new Vector3(x, 0.55f, -0.35f), 0.06f, 0.2f, new Color(0.24f, 0.26f, 0.38f));
        }
        Escena.Esfera(g.transform, "Pelota", new Vector3(0.72f, 0.24f, 0.45f), 0.24f, new Color(0.78f, 0.43f, 0.56f));
        return g;
    }

    static GameObject Plataforma(Transform padre, Vector3 pos, float rotY)
    {
        var g = Raiz(padre, "Plataforma", pos, rotY);
        Escena.Caja(g.transform, "Base",    new Vector3(0f, 0.04f, 0f),   new Vector3(0.7f, 0.08f, 0.5f), new Color(0.24f, 0.26f, 0.38f));
        Escena.Caja(g.transform, "Tapa",    new Vector3(0f, 0.09f, 0f),   new Vector3(0.64f, 0.02f, 0.44f), new Color(0.5f, 0.83f, 0.91f));
        Escena.Cilindro(g.transform, "Poste", new Vector3(0.3f, 0.45f, -0.2f), 0.03f, 0.9f, Escena.Patas);
        Escena.Caja(g.transform, "Monitor", new Vector3(0.3f, 0.95f, -0.2f), new Vector3(0.3f, 0.22f, 0.04f), new Color(0.18f, 0.28f, 0.35f));
        return g;
    }

    static GameObject Hidro(Transform padre, Vector3 pos, float rotY)
    {
        var g = Raiz(padre, "Hidroterapia", pos, rotY);
        Escena.Caja(g.transform, "Borde",   new Vector3(0f, 0.17f, 0f), new Vector3(1.5f, 0.34f, 1.0f), new Color(0.86f, 0.83f, 0.78f));
        Escena.Caja(g.transform, "Agua",    new Vector3(0f, 0.33f, 0f), new Vector3(1.3f, 0.04f, 0.82f), new Color(0.37f, 0.75f, 0.87f));
        Escena.Caja(g.transform, "Escalon", new Vector3(0.9f, 0.2f, 0f), new Vector3(0.3f, 0.05f, 0.5f), new Color(0.94f, 0.95f, 0.96f));
        return g;
    }
}

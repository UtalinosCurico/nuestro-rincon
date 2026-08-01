using UnityEngine;

/// <summary>
/// Un kinesiólogo o un paciente. El cuerpo se arma con primitivas y la
/// animación es por código (no hay rig ni clips): se balancea al trabajar y
/// da pasitos al caminar. Suficiente para el estilo low-poly y evita tener
/// que importar animaciones que yo no puedo previsualizar.
/// </summary>
public class Personaje : MonoBehaviour
{
    public bool EsKine;
    public string Nombre = "";
    public Vector3 Base;

    Vector3? _destino;
    float _fase;
    Transform _cuerpo;
    Animator _animador;

    public static Personaje Crear(Transform padre, Vector3 pos, bool esKine, Color ropa, string nombre = "", int indice = 0)
    {
        var g = new GameObject(esKine ? "Kine" : "Paciente");
        g.transform.SetParent(padre, false);
        g.transform.localPosition = pos;

        var p = g.AddComponent<Personaje>();
        p.EsKine = esKine;
        p.Nombre = nombre;
        p.Base = pos;
        p._fase = Random.Range(0f, 6.28f);

        // Si hay un modelo de Meshy en Resources, se usa ese; si no, se cae
        // a las primitivas. Así el juego nunca queda roto por un modelo que falte.
        // Cada uno tiene su modelo: Kine0..2 y Paciente0..2. Si falta el del
        // índice pedido, se rota entre los que sí existen; y si no hay ninguno,
        // se cae a las primitivas y el juego igual funciona.
        GameObject modelo = null;
        for (int intento = 0; intento < 3 && modelo == null; intento++)
        {
            int idx = (indice + intento) % 3;
            modelo = Resources.Load<GameObject>((esKine ? "Kine" : "Paciente") + idx);
        }
        if (modelo != null)
        {
            var m = Object.Instantiate(modelo, g.transform);
            m.transform.localPosition = Vector3.zero;
            p._animador = m.GetComponentInChildren<Animator>();
            var col0 = g.AddComponent<BoxCollider>();
            col0.center = new Vector3(0f, 0.85f, 0f);
            col0.size = new Vector3(0.6f, 1.7f, 0.45f);
            return p;
        }

        var color = esKine ? Escena.Tunica : ropa;
        var cuerpo = Escena.Caja(g.transform, "Cuerpo", new Vector3(0f, 0.45f, 0f), new Vector3(0.34f, 0.42f, 0.24f), color);
        p._cuerpo = cuerpo.transform;
        Escena.Esfera(g.transform, "Cabeza", new Vector3(0f, 0.80f, 0f), 0.15f, Escena.Piel);
        Escena.Esfera(g.transform, "Pelo",   new Vector3(0f, 0.845f, -0.01f), 0.145f, Escena.Pelo);
        Escena.Caja(g.transform, "Piernas", new Vector3(0f, 0.16f, 0f), new Vector3(0.26f, 0.32f, 0.2f),
                    esKine ? Escena.Camilla : new Color(0.33f, 0.38f, 0.42f));

        if (esKine)
        {
            // parche institucional en la manga. Es un color plano a propósito:
            // no se inventó ningún escudo. Si Diego pasa la imagen real, acá
            // se cambia por un material con esa textura.
            Escena.Caja(g.transform, "Parche", new Vector3(-0.175f, 0.52f, 0.02f), new Vector3(0.02f, 0.09f, 0.09f), Escena.Parche);
            Escena.Caja(g.transform, "Credencial", new Vector3(0.08f, 0.40f, 0.13f), new Vector3(0.07f, 0.09f, 0.02f), Color.white);
        }

        // un collider para poder tocarlo con el mouse o el dedo
        var col = g.AddComponent<BoxCollider>();
        col.center = new Vector3(0f, 0.5f, 0f);
        col.size = new Vector3(0.42f, 1.0f, 0.34f);
        return p;
    }

    public void IrA(Vector3 destino) => _destino = destino;

    void Update()
    {
        float t = Time.time;
        if (_destino.HasValue)
        {
            var d = _destino.Value - transform.localPosition;
            d.y = 0f;
            float dist = d.magnitude;
            if (dist < 0.06f)
            {
                _destino = null;
                if (_animador != null) _animador.speed = 0f;   // quieto: congela el clip
                var p0 = transform.localPosition; p0.y = 0f; transform.localPosition = p0;
            }
            else
            {
                if (_animador != null) _animador.speed = 1f;
                var paso = d.normalized * Mathf.Min(1.8f * Time.deltaTime, dist);
                transform.localPosition += paso;
                transform.localRotation = Quaternion.LookRotation(new Vector3(d.x, 0f, d.z));
                if (_animador == null)
                {
                    // pasitos caseros solo si NO hay animación de verdad
                    var p1 = transform.localPosition;
                    p1.y = Mathf.Abs(Mathf.Sin(t * 11f)) * 0.04f;
                    transform.localPosition = p1;
                }
            }
            return;
        }

        if (_animador != null) { _animador.speed = 0f; return; }

        if (EsKine)
        {
            // trabajando: se balancea
            var p = transform.localPosition;
            p.y = Mathf.Abs(Mathf.Sin(t * 1.7f + _fase)) * 0.045f;
            transform.localPosition = p;
        }
        else
        {
            // esperando: se mueve apenas
            transform.localRotation = Quaternion.Euler(0f, Mathf.Sin(t * 0.5f + _fase) * 16f, 0f);
        }
    }
}

using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Punto de entrada. Se cuelga de un único GameObject vacío en la escena y
/// arma todo lo demás. La escena del editor queda prácticamente vacía a
/// propósito: así el proyecto es legible y no hay YAML que se pueda corromper.
/// </summary>
public class Clinica : MonoBehaviour
{
    [System.Serializable]
    public class Estado
    {
        public int salas = 1;
        public int reputacion = 0;
        public double dinero = 0;
        public string[] equipos = new string[0];
        public string[] personal = new string[0];
    }

    public Estado estado = new Estado();

    Transform _raiz;
    CamaraOrbital _cam;
    readonly List<GameObject> _dinamicos = new List<GameObject>();
    Personaje _seleccionado;
    GameObject _anillo;
    Juego _juego;
    Personaje _jugadora;
    readonly List<Personaje> _enEspera = new List<Personaje>();

    void Start()
    {
        Application.targetFrameRate = 60;

        _raiz = new GameObject("Clinica").transform;
        Escena.ConstruirSala(_raiz);
        CrearLuces();
        CrearCamara();
        CrearAnillo();

        // El estado real llega desde la página (mismo datos.juegos.clinica que
        // ya usa la versión web, así comparte progreso y se sincroniza a Neon).
        Puente.PedirEstado(this);
        Reconstruir();
        // Si la página no contesta (por ejemplo abierto suelto, sin el rincón),
        // al segundo se muestra una clínica de ejemplo en vez de una sala vacía.
        Invoke(nameof(DemoSiNadieContesta), 1f);
        _juego = gameObject.AddComponent<Juego>();
        _juego.clinica = this;
    }

    bool _llegoEstado;

    void DemoSiNadieContesta()
    {
        if (_llegoEstado) return;
        estado = new Estado {
            salas = 3, reputacion = 45, dinero = 90000,
            equipos = new[] { "tens", "eco", "gym", "plataforma", "hidro" },
            personal = new[] { "Catalina", "Ana", "Luis" }
        };
        Reconstruir();
    }

    void CrearLuces()
    {
        var solGO = new GameObject("Sol");
        var sol = solGO.AddComponent<Light>();
        sol.type = LightType.Directional;
        sol.color = new Color(1f, 0.95f, 0.86f);
        sol.intensity = 0.8f;
        sol.shadows = LightShadows.Soft;
        solGO.transform.rotation = Quaternion.Euler(48f, 35f, 0f);

        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(0.55f, 0.60f, 0.66f);
        RenderSettings.ambientEquatorColor = new Color(0.55f, 0.56f, 0.58f);
        RenderSettings.ambientGroundColor = new Color(0.34f, 0.32f, 0.30f);
    }

    void CrearCamara()
    {
        var go = new GameObject("Camara");
        var c = go.AddComponent<Camera>();
        c.fieldOfView = 42f;
        c.backgroundColor = new Color(0.93f, 0.95f, 0.94f);
        c.clearFlags = CameraClearFlags.SolidColor;
        go.AddComponent<AudioListener>();
        _cam = go.AddComponent<CamaraOrbital>();
    }

    void CrearAnillo()
    {
        _anillo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        _anillo.name = "Seleccion";
        Destroy(_anillo.GetComponent<Collider>());
        _anillo.transform.localScale = new Vector3(0.6f, 0.01f, 0.6f);
        _anillo.GetComponent<Renderer>().sharedMaterial = Escena.Mat(new Color(0.96f, 0.77f, 0.26f));
        _anillo.SetActive(false);
    }

    /// <summary>Rehace camillas, equipos y gente según el estado. Se llama
    /// cada vez que se compra algo, para que aparezca al instante.</summary>
    public void Reconstruir()
    {
        foreach (var g in _dinamicos) if (g != null) Destroy(g);
        _dinamicos.Clear();
        _enEspera.Clear();
        _jugadora = null;

        int salas = Mathf.Max(1, estado.salas);
        for (int i = 0; i < salas; i++)
        {
            float x = Escena.BoxX[Mathf.Min(i, Escena.BoxX.Length - 1)];
            _dinamicos.Add(Escena.CrearCamilla(_raiz, new Vector3(x, 0f, Escena.BoxZ)));

            if (i < estado.personal.Length)
            {
                var k = Personaje.Crear(_raiz, new Vector3(x + 0.8f, 0f, Escena.BoxZ), true, Color.white, estado.personal[i], i);
                k.transform.localRotation = Quaternion.Euler(0f, -90f, 0f);
                k.Poner("quieto");        // la de Catalina es "atendiendo al paciente"
                if (i == 0) _jugadora = k;   // Catalina: el personaje que controlas
                _dinamicos.Add(k.gameObject);

                // El paciente va DE PIE al otro lado de la camilla, siendo evaluado.
                // Se intentó acostarlo con la animación de Meshy y quedaba flotando:
                // ese clip empieza de pie y desplaza el cuerpo mientras cae, así que
                // dónde termina el cuerpo no coincide con dónde está el objeto.
                // De pie es su pose natural, no flota, y la escena se lee igual.
                var p = Personaje.Crear(_raiz, new Vector3(x - 0.8f, 0f, Escena.BoxZ), false,
                                        Escena.Ropa[i % Escena.Ropa.Length], "", i);
                p.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);
                p.Poner("quieto");
                _dinamicos.Add(p.gameObject);
            }
        }

        foreach (var id in estado.equipos)
        {
            var g = Equipos.Crear(_raiz, id);
            if (g != null) _dinamicos.Add(g);
        }

        int esperando = Mathf.Min(3, 1 + estado.reputacion / 25);   // pocos, para que no se vea amontonado
        for (int i = 0; i < esperando; i++)
        {
            var s = Personaje.Crear(_raiz, new Vector3(4.6f - i * 1.5f, 0f, 1.1f), false,
                                    Escena.Ropa[i % Escena.Ropa.Length], "", i);
            s.transform.localRotation = Quaternion.Euler(0f, -90f, 0f);   // mirando al pasillo
            _enEspera.Add(s);
            _dinamicos.Add(s.gameObject);
        }

        if (_cam != null) _cam.AjustarPorTamano(salas + estado.equipos.Length);
        if (_juego != null) _juego.Configurar(_jugadora, _enEspera, estado.dinero, estado.reputacion);
    }

    void Update()
    {
        bool toque = Input.GetMouseButtonUp(0) ||
                     (Input.touchCount == 1 && Input.GetTouch(0).phase == TouchPhase.Ended);
        if (!toque) return;

        Vector2 pos = Input.touchCount == 1 ? Input.GetTouch(0).position : (Vector2)Input.mousePosition;
        var cam = Camera.main;
        if (cam == null) return;

        if (Physics.Raycast(cam.ScreenPointToRay(pos), out var hit, 60f))
        {
            var per = hit.collider.GetComponentInParent<Personaje>();
            if (per != null)
            {
                Seleccionar(per);
                // tocar a alguien de la sala de espera = ir a buscarlo
                if (_juego != null && _enEspera.Contains(per)) _juego.TomarPaciente(per);
                return;
            }
        }

        // tocó el piso: mando al seleccionado para allá
        {
            var plano = new Plane(Vector3.up, Vector3.zero);
            var rayo = cam.ScreenPointToRay(pos);
            if (plano.Raycast(rayo, out float dd))
            {
                var p = rayo.GetPoint(dd);
                var meta = new Vector3(Mathf.Clamp(p.x, -6f, 6f), 0f, Mathf.Clamp(p.z, -4.2f, 4.4f));
                // por defecto se mueve Catalina; si elegiste a otro, se mueve ese
                if (_seleccionado == _jugadora || _seleccionado == null) { if (_juego != null) _juego.MoverJugador(meta); }
                else _seleccionado.IrA(meta);
            }
        }
    }

    void Seleccionar(Personaje p)
    {
        _seleccionado = p;
        _anillo.SetActive(true);
        Puente.AvisarSeleccion(p.EsKine ? "kine" : "paciente", p.Nombre);
    }

    void LateUpdate()
    {
        if (_anillo != null && _anillo.activeSelf && _seleccionado != null)
            _anillo.transform.position = _seleccionado.transform.position + Vector3.up * 0.02f;
    }

    /// <summary>La llama la página (vía SendMessage) cuando cambia el estado.</summary>
    public void RecibirEstado(string json)
    {
        try
        {
            _llegoEstado = true;
            estado = JsonUtility.FromJson<Estado>(json);
            if (estado == null) estado = new Estado();
            if (estado.equipos == null) estado.equipos = new string[0];
            if (estado.personal == null) estado.personal = new string[0];
            Reconstruir();
        }
        catch (System.Exception e) { Debug.LogWarning("Estado inválido: " + e.Message); }
    }
}

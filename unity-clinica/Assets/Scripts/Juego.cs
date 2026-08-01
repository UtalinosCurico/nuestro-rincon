using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// El bucle jugable. Catalina es el personaje que controlas: tocas el piso y
/// camina, tocas a un paciente de la sala de espera y lo va a buscar; el
/// paciente la sigue hasta un box libre y ahí se atiende. Atender paga.
/// Los demás kinesiólogos son NPC y atienden solos.
/// Pensado para celular: todo se juega con toques, sin teclado.
/// </summary>
public class Juego : MonoBehaviour
{
    public Clinica clinica;

    Personaje _jugador;
    Text _txtPlata, _txtRep, _txtAviso;
    float _avisoHasta;

    double _plata;
    int _rep, _atendidos;

    class Atencion
    {
        public Personaje paciente;
        public int box;
        public float termina;
        public bool enCurso;
    }
    Atencion _actual;
    readonly List<Personaje> _espera = new List<Personaje>();
    readonly HashSet<int> _boxOcupado = new HashSet<int>();

    public void Configurar(Personaje jugador, List<Personaje> espera, double plata, int rep)
    {
        _jugador = jugador;
        _espera.Clear();
        _espera.AddRange(espera);
        _plata = plata;
        _rep = rep;
        Refrescar();
    }

    void Start() { CrearInterfaz(); }

    /// <summary>Interfaz mínima, con tamaños pensados para un teléfono.</summary>
    void CrearInterfaz()
    {
        var go = new GameObject("UI");
        var canvas = go.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = go.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(720, 1280);   // vertical, como un celular
        scaler.matchWidthOrHeight = 0.5f;
        go.AddComponent<GraphicRaycaster>();

        _txtPlata = Texto(go.transform, "Plata", new Vector2(0f, 1f), new Vector2(24f, -24f), 46, TextAnchor.UpperLeft);
        _txtRep   = Texto(go.transform, "Rep",   new Vector2(0f, 1f), new Vector2(24f, -84f), 32, TextAnchor.UpperLeft);
        _txtAviso = Texto(go.transform, "Aviso", new Vector2(0.5f, 0f), new Vector2(0f, 120f), 34, TextAnchor.LowerCenter);
        _txtAviso.rectTransform.sizeDelta = new Vector2(660f, 120f);
        Aviso("Toca a un paciente para ir a buscarlo");
        Refrescar();
    }

    Text Texto(Transform padre, string nom, Vector2 anclaje, Vector2 pos, int tam, TextAnchor alin)
    {
        var g = new GameObject(nom);
        g.transform.SetParent(padre, false);
        var t = g.AddComponent<Text>();
        t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (t.font == null) t.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        t.fontSize = tam;
        t.alignment = alin;
        t.color = new Color(0.16f, 0.22f, 0.27f);
        var sombra = g.AddComponent<Outline>();
        sombra.effectColor = new Color(1f, 1f, 1f, 0.85f);
        sombra.effectDistance = new Vector2(2f, -2f);
        var rt = t.rectTransform;
        rt.anchorMin = rt.anchorMax = anclaje;
        rt.pivot = anclaje;
        rt.anchoredPosition = pos;
        rt.sizeDelta = new Vector2(420f, 60f);
        return t;
    }

    void Aviso(string s) { if (_txtAviso != null) { _txtAviso.text = s; _avisoHasta = Time.time + 4f; } }

    void Refrescar()
    {
        if (_txtPlata != null) _txtPlata.text = "$" + Mathf.FloorToInt((float)_plata).ToString("N0");
        if (_txtRep != null) _txtRep.text = "⭐ " + _rep + "   ·   " + _atendidos + " atendidos";
    }

    /// <summary>Le pasa el paciente elegido: Catalina va a buscarlo.</summary>
    public void TomarPaciente(Personaje p)
    {
        if (_jugador == null || _actual != null) { Aviso("Termina con el paciente actual"); return; }
        int box = BoxLibre();
        if (box < 0) { Aviso("No hay box libre"); return; }
        _actual = new Atencion { paciente = p, box = box, enCurso = false };
        _boxOcupado.Add(box);
        _jugador.IrA(p.transform.localPosition + new Vector3(0.8f, 0f, 0f));
        Aviso("Vas a buscar al paciente");
    }

    int BoxLibre()
    {
        for (int i = 0; i < Escena.BoxX.Length; i++) if (!_boxOcupado.Contains(i)) return i;
        return -1;
    }

    void Update()
    {
        if (_txtAviso != null && Time.time > _avisoHasta && _txtAviso.text.Length > 0) _txtAviso.text = "";
        if (_actual == null || _jugador == null) return;

        var a = _actual;
        float x = Escena.BoxX[a.box];
        var destinoBox = new Vector3(x + 0.8f, 0f, Escena.BoxZ);

        if (!a.enCurso)
        {
            // ¿ya llegó donde el paciente? entonces los dos van al box
            float d = Vector3.Distance(
                new Vector3(_jugador.transform.localPosition.x, 0f, _jugador.transform.localPosition.z),
                new Vector3(a.paciente.transform.localPosition.x, 0f, a.paciente.transform.localPosition.z));
            if (d < 1.6f && !a.paciente.Siguiendo)
            {
                a.paciente.Seguir(_jugador.transform);
                _jugador.IrA(destinoBox);
                Aviso("El paciente te sigue al box");
            }
            // ¿llegaron al box?
            if (a.paciente.Siguiendo &&
                Vector3.Distance(_jugador.transform.localPosition, destinoBox) < 0.5f)
            {
                a.paciente.DejarDeSeguir();
                a.paciente.IrA(new Vector3(x - 0.8f, 0f, Escena.BoxZ));
                a.enCurso = true;
                a.termina = Time.time + 4f;
                Aviso("Atendiendo…");
            }
        }
        else if (Time.time >= a.termina)
        {
            int pago = 150 + Random.Range(0, 120);
            _plata += pago;
            _rep += 1;
            _atendidos++;
            _boxOcupado.Remove(a.box);
            _actual = null;
            Refrescar();
            Aviso("Paciente atendido · +$" + pago);
        }
    }

    /// <summary>Lo llama Clinica cuando tocas el piso.</summary>
    public void MoverJugador(Vector3 destino)
    {
        if (_jugador != null) _jugador.IrA(destino);
    }
}

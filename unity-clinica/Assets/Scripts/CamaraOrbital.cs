using UnityEngine;

/// <summary>
/// Cámara FIJA, tipo transmisión de televisión: el ángulo nunca cambia, así no
/// te pierdes girando en 3D. Solo se desplaza (arrastrando) y se acerca
/// (rueda o pellizco). Antes era orbital y costaba manejarla.
/// </summary>
public class CamaraOrbital : MonoBehaviour
{
    // Yaw 204° = mirando desde el pasillo hacia los boxes. Con 24° la cámara
    // quedaba detrás y los personajes daban la espalda.
    static readonly Quaternion Angulo = Quaternion.Euler(50f, 204f, 0f);

    public Vector2 LimiteX = new Vector2(-4.5f, 4.5f);
    public Vector2 LimiteZ = new Vector2(-4f, 3.5f);

    Vector3 _centro = new Vector3(0f, 0f, -1.5f);
    float _dist = 33f;
    const float DistMin = 14f, DistMax = 46f;

    Vector3 _centroSuave;
    float _distSuave;
    Vector2 _ultimoDedo;
    bool _arrastrando;
    float _pellizcoPrevio = -1f;

    public bool ArrastreReal { get; private set; }

    void Start()
    {
        _centroSuave = _centro;
        _distSuave = _dist;
        transform.rotation = Angulo;
    }

    void LateUpdate()
    {
        LeerEntrada();

        // En pantalla vertical cabe menos a lo ancho: hay que alejarse.
        float vertical = Mathf.Clamp((float)Screen.height / Mathf.Max(1, Screen.width), 1f, 2.2f);
        float extra = (vertical - 1f) * 6f;
        _dist = Mathf.Clamp(_dist, DistMin, DistMax + extra);
        _centro.x = Mathf.Clamp(_centro.x, LimiteX.x, LimiteX.y);
        _centro.z = Mathf.Clamp(_centro.z, LimiteZ.x, LimiteZ.y);

        // suavizado: se siente fluido en vez de a saltos
        float k = 1f - Mathf.Exp(-10f * Time.deltaTime);
        _centroSuave = Vector3.Lerp(_centroSuave, _centro, k);
        _distSuave = Mathf.Lerp(_distSuave, _dist, k);

        transform.rotation = Angulo;
        transform.position = _centroSuave - Angulo * Vector3.forward * _distSuave;
    }

    void LeerEntrada()
    {
        if (Input.touchCount == 2)
        {
            float d = Vector2.Distance(Input.GetTouch(0).position, Input.GetTouch(1).position);
            if (_pellizcoPrevio > 0f) _dist -= (d - _pellizcoPrevio) * 0.02f;
            _pellizcoPrevio = d;
            _arrastrando = false;
            return;
        }
        _pellizcoPrevio = -1f;

        Vector2 dedo;
        bool abajo, arriba;
        if (Input.touchCount == 1)
        {
            var t = Input.GetTouch(0);
            dedo = t.position;
            abajo = t.phase == TouchPhase.Began;
            arriba = t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled;
        }
        else
        {
            dedo = Input.mousePosition;
            abajo = Input.GetMouseButtonDown(0);
            arriba = Input.GetMouseButtonUp(0);
            float rueda = Input.mouseScrollDelta.y;
            if (Mathf.Abs(rueda) > 0.01f) _dist -= rueda * 1.2f;
        }

        if (abajo) { _arrastrando = true; _ultimoDedo = dedo; ArrastreReal = false; }
        if (arriba) _arrastrando = false;

        if (_arrastrando)
        {
            var delta = dedo - _ultimoDedo;
            if (delta.sqrMagnitude > 36f)   // umbral: un toque simple no debe desplazar
            {
                ArrastreReal = true;
                _ultimoDedo = dedo;
                var der = Angulo * Vector3.right;
                var ade = Vector3.Cross(Vector3.up, der).normalized;
                float f = _distSuave * 0.0016f;
                _centro -= (der * delta.x + ade * delta.y) * f;
            }
        }
    }

    public void AjustarPorTamano(int cosas) { }   // la cámara es fija: ya no aplica
}

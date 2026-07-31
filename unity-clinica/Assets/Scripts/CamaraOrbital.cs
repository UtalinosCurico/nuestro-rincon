using UnityEngine;

/// <summary>
/// Cámara que el jugador puede mover: arrastrar para girar, rueda o pellizco
/// para acercar. Es lo que pedía Diego —"que se pueda jugar en 3D"— y lo que
/// la versión web no tenía, porque ahí la cámara solo se paseaba sola.
/// Cuando nadie la toca, vuelve a un vaivén lento para que la escena respire.
/// </summary>
public class CamaraOrbital : MonoBehaviour
{
    public Vector3 Centro = new Vector3(0f, 0.7f, 0f);
    public float DistMin = 3.5f, DistMax = 14f;

    float _angulo = -0.3f, _altura = 4.2f, _dist = 8.5f;
    float _inactivo;
    Vector2 _ultimoDedo;
    bool _arrastrando;
    float _pellizcoPrevio = -1f;

    void LateUpdate()
    {
        LeerEntrada();

        // sin interacción por un rato, la cámara retoma su paseo suave
        _inactivo += Time.deltaTime;
        if (_inactivo > 4f) _angulo += Mathf.Sin(Time.time * 0.13f) * 0.0016f;

        _dist = Mathf.Clamp(_dist, DistMin, DistMax);
        _altura = Mathf.Clamp(_altura, 1.6f, 7f);

        var pos = new Vector3(Mathf.Sin(_angulo) * _dist, _altura, Mathf.Cos(_angulo) * _dist);
        transform.position = Vector3.Lerp(transform.position, pos, 1f - Mathf.Exp(-8f * Time.deltaTime));
        transform.rotation = Quaternion.Slerp(transform.rotation,
            Quaternion.LookRotation(Centro - transform.position), 1f - Mathf.Exp(-8f * Time.deltaTime));
    }

    void LeerEntrada()
    {
        // dos dedos: pellizco para acercar
        if (Input.touchCount == 2)
        {
            var a = Input.GetTouch(0).position;
            var b = Input.GetTouch(1).position;
            float d = Vector2.Distance(a, b);
            if (_pellizcoPrevio > 0f) { _dist -= (d - _pellizcoPrevio) * 0.012f; _inactivo = 0f; }
            _pellizcoPrevio = d;
            _arrastrando = false;
            return;
        }
        _pellizcoPrevio = -1f;

        Vector2? dedo = null;
        bool abajo = false, arriba = false;
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
            if (Mathf.Abs(rueda) > 0.01f) { _dist -= rueda * 0.6f; _inactivo = 0f; }
        }

        if (abajo) { _arrastrando = true; _ultimoDedo = dedo.Value; }
        if (arriba) _arrastrando = false;

        if (_arrastrando && dedo.HasValue)
        {
            var delta = dedo.Value - _ultimoDedo;
            _ultimoDedo = dedo.Value;
            if (delta.sqrMagnitude > 0.01f)
            {
                _angulo -= delta.x * 0.005f;
                _altura = Mathf.Clamp(_altura - delta.y * 0.012f, 1.6f, 7f);
                _inactivo = 0f;
            }
        }
    }

    /// <summary>Se aleja a medida que la clínica crece, para que quepa todo.
    /// Mismo criterio que se usó en la versión web.</summary>
    public void AjustarPorTamano(int cosas)
    {
        float objetivo = 5.6f + Mathf.Min(cosas, 12) * 0.24f;
        if (_inactivo > 3f) _dist = Mathf.Lerp(_dist, objetivo, 0.5f);
        DistMax = Mathf.Max(11f, objetivo + 3f);
    }
}

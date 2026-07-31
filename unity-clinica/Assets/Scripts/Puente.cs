using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>
/// Habla con la página que contiene el juego. En el editor no hay navegador,
/// así que todo esto queda desactivado y el juego corre con estado de prueba:
/// por eso los #if, para poder darle Play en Unity sin que reviente.
/// </summary>
public static class Puente
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void PuentePedirEstado(string objeto);
    [DllImport("__Internal")] private static extern void PuenteGuardar(string json);
    [DllImport("__Internal")] private static extern void PuenteAvisarSeleccion(string tipo, string nombre);
#endif

    public static void PedirEstado(Clinica c)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        PuentePedirEstado(c.gameObject.name);
#else
        // En el editor: una clínica de muestra para poder probar sin la página.
        c.estado = new Clinica.Estado {
            salas = 3, reputacion = 48, dinero = 90000,
            equipos = new[] { "tens", "eco", "gym", "plataforma", "hidro" },
            personal = new[] { "Ana", "Luis", "Rocío" }
        };
        c.Reconstruir();
#endif
    }

    public static void Guardar(string json)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        PuenteGuardar(json);
#endif
    }

    public static void AvisarSeleccion(string tipo, string nombre)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        PuenteAvisarSeleccion(tipo, nombre ?? "");
#else
        Debug.Log("Seleccionado: " + tipo + " " + nombre);
#endif
    }
}

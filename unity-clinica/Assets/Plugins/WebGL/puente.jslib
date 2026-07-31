// Puente entre el juego de Unity y la página.
// Así el juego 3D lee y escribe el MISMO datos.juegos.clinica que ya usa el
// rincón, y por lo tanto se sincroniza con Neon igual que todo lo demás.
// Sin esto, el juego de Unity tendría su propio progreso aparte.
mergeInto(LibraryManager.library, {

  PuentePedirEstado: function (objeto) {
    var nombre = UTF8ToString(objeto);
    try {
      var payload = (window.parent && window.parent.unityEstadoClinica)
        ? window.parent.unityEstadoClinica()
        : (window.unityEstadoClinica ? window.unityEstadoClinica() : null);
      if (payload) {
        // SendMessage llega al método RecibirEstado del GameObject
        SendMessage(nombre, 'RecibirEstado', payload);
      }
    } catch (e) {
      console.warn('Puente: no se pudo leer el estado', e);
    }
  },

  PuenteGuardar: function (json) {
    var s = UTF8ToString(json);
    try {
      var f = (window.parent && window.parent.unityGuardarClinica)
        ? window.parent.unityGuardarClinica
        : window.unityGuardarClinica;
      if (f) f(s);
    } catch (e) {
      console.warn('Puente: no se pudo guardar', e);
    }
  },

  PuenteAvisarSeleccion: function (tipo, nombre) {
    try {
      var f = (window.parent && window.parent.unitySeleccion)
        ? window.parent.unitySeleccion
        : window.unitySeleccion;
      if (f) f(UTF8ToString(tipo), UTF8ToString(nombre));
    } catch (e) {}
  }
});

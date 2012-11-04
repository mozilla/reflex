module.exports = atom

/*
    Atom produces a `reactor` function out of given `write` function
    responsible for applying state changes to a single entity of the atom
    and a `read` function that is responsible for reading state changes caused
    by interaction with that entity.

    In case of UI component is likely to be a widget. Given `write` function
    will reflect changes to the view of that widget while `read` function will
    map user interaction events to that widget into state changes.
*/
function atom(write, read) {
  return function reactor(changes, options) {
    var entity = write(changes, options)
    if (read) {
      return read(entity, options)
    }
  }
}

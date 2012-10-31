module.exports = atom

function atom(write, read) {
  return function reactor(changes, options) {
    var entity = write(changes, options)
    if (read) {
      return read(entity, options)
    }
  }
}

module.exports = atom

function atom(read, write) {
  return function reactor(changes, options) {
    var entity = write(changes, options)
    return read(entity, options)
  }
}

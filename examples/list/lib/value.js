module.exports = value

function value(data) {
    return function constant() {
        return data
    }
}

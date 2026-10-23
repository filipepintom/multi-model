// Parser de uma linha CSV.
function parseLine(line) {
  return line.split(',');
}

module.exports = { parseLine };

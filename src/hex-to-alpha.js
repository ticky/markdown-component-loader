const empty = '';

// Converts a hexadecimal string to an alphabetic string
// for instance, "0" becomes "j", "f" becomes "y"
export default (hexString, offsetChar = 'j') => (
  hexString
    .split(empty)
    .reduce(
      (accumulator, hexDigit) => (
        accumulator + (
          String.fromCharCode(
            parseInt(hexDigit, 16) + offsetChar.charCodeAt(0)
          )
        )
      ),
      empty
    )
);

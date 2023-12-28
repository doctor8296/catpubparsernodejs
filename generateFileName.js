
function generateFileName() {
  const currentDate = new Date();

  // Format the date and time components
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  // Construct the file name using the date and time components
  const fileName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_catpub.xlsx`;

  return fileName;
}

module.exports = generateFileName;

function addMonths(date, months) {
  const d = new Date(date.getTime())
  d.setMonth(d.getMonth() + months)
  return d
}

module.exports = { addMonths }





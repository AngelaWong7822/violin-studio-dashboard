// Hong Kong general holidays, used to flag lesson dates that fall on one.
// Source: the government's 1823 feed, https://www.1823.gov.hk/common/ical/tc.json
// (copied 2026-11-25; it covered 2026 and 2027). Names are shortened a little
// from the official wording. When the government publishes later years, add
// them below and raise HK_HOLIDAYS_LAST_YEAR.
const HK_HOLIDAYS_LAST_YEAR = 2027;
const HK_HOLIDAYS = {
  // date: [中文, English]
  "2026-01-01": ["元旦", "New Year's Day"],
  "2026-02-17": ["農曆年初一", "Lunar New Year's Day"],
  "2026-02-18": ["農曆年初二", "2nd day of Lunar New Year"],
  "2026-02-19": ["農曆年初三", "3rd day of Lunar New Year"],
  "2026-04-03": ["耶穌受難節", "Good Friday"],
  "2026-04-04": ["耶穌受難節翌日", "Day after Good Friday"],
  "2026-04-06": ["清明節翌日", "Day after Ching Ming"],
  "2026-04-07": ["復活節星期一翌日", "Day after Easter Monday"],
  "2026-05-01": ["勞動節", "Labour Day"],
  "2026-05-25": ["佛誕翌日", "Day after Buddha's Birthday"],
  "2026-06-19": ["端午節", "Tuen Ng Festival"],
  "2026-07-01": ["回歸紀念日", "HKSAR Establishment Day"],
  "2026-09-26": ["中秋節翌日", "Day after Mid-Autumn Festival"],
  "2026-10-01": ["國慶日", "National Day"],
  "2026-10-19": ["重陽節翌日", "Day after Chung Yeung"],
  "2026-12-25": ["聖誕節", "Christmas Day"],
  "2026-12-26": ["聖誕節後第一個周日", "First weekday after Christmas"],
  "2027-01-01": ["元旦", "New Year's Day"],
  "2027-02-06": ["農曆年初一", "Lunar New Year's Day"],
  "2027-02-08": ["農曆年初三", "3rd day of Lunar New Year"],
  "2027-02-09": ["農曆年初四", "4th day of Lunar New Year"],
  "2027-03-26": ["耶穌受難節", "Good Friday"],
  "2027-03-27": ["耶穌受難節翌日", "Day after Good Friday"],
  "2027-03-29": ["復活節星期一", "Easter Monday"],
  "2027-04-05": ["清明節", "Ching Ming Festival"],
  "2027-05-01": ["勞動節", "Labour Day"],
  "2027-05-13": ["佛誕", "Buddha's Birthday"],
  "2027-06-09": ["端午節", "Tuen Ng Festival"],
  "2027-07-01": ["回歸紀念日", "HKSAR Establishment Day"],
  "2027-09-16": ["中秋節翌日", "Day after Mid-Autumn Festival"],
  "2027-10-01": ["國慶日", "National Day"],
  "2027-10-08": ["重陽節", "Chung Yeung Festival"],
  "2027-12-25": ["聖誕節", "Christmas Day"],
  "2027-12-27": ["聖誕節後第一個周日", "First weekday after Christmas"],
};

// The holiday's name for a Date (by its local calendar day), or "" if none.
function hkHolidayName(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const names = HK_HOLIDAYS[`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`];
  if (!names) return "";
  return names[getLang() === "zh-Hant" ? 0 : 1];
}

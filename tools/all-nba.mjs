// All-NBA selections by season END year, 1980–2026.
// Source: https://www.basketball-reference.com/awards/all_league.html (pulled 2026-11-22).
// Used by build-players.mjs to check eligibility and to sanity-check era ratings.
export const ALL_NBA_RAW = `
1980: 1st: Kareem Abdul-Jabbar, Larry Bird, Julius Erving, George Gervin, Paul Westphal | 2nd: Moses Malone, Marques Johnson, Dan Roundfield, Dennis Johnson, Gus Williams
1981: 1st: Kareem Abdul-Jabbar, Larry Bird, Julius Erving, George Gervin, Dennis Johnson | 2nd: Moses Malone, Adrian Dantley, Marques Johnson, Tiny Archibald, Otis Birdsong
1982: 1st: Moses Malone, Larry Bird, Julius Erving, George Gervin, Gus Williams | 2nd: Robert Parish, Alex English, Bernard King, Magic Johnson, Sidney Moncrief
1983: 1st: Moses Malone, Larry Bird, Julius Erving, Magic Johnson, Sidney Moncrief | 2nd: Kareem Abdul-Jabbar, Alex English, Buck Williams, George Gervin, Isiah Thomas
1984: 1st: Kareem Abdul-Jabbar, Larry Bird, Bernard King, Magic Johnson, Isiah Thomas | 2nd: Moses Malone, Adrian Dantley, Julius Erving, Sidney Moncrief, Jim Paxson
1985: 1st: Moses Malone, Larry Bird, Bernard King, Magic Johnson, Isiah Thomas | 2nd: Kareem Abdul-Jabbar, Terry Cummings, Ralph Sampson, Michael Jordan, Sidney Moncrief
1986: 1st: Kareem Abdul-Jabbar, Larry Bird, Dominique Wilkins, Magic Johnson, Isiah Thomas | 2nd: Hakeem Olajuwon, Charles Barkley, Alex English, Sidney Moncrief, Alvin Robertson
1987: 1st: Hakeem Olajuwon, Larry Bird, Kevin McHale, Magic Johnson, Michael Jordan | 2nd: Moses Malone, Charles Barkley, Dominique Wilkins, Fat Lever, Isiah Thomas
1988: 1st: Hakeem Olajuwon, Charles Barkley, Larry Bird, Magic Johnson, Michael Jordan | 2nd: Patrick Ewing, Karl Malone, Dominique Wilkins, Clyde Drexler, John Stockton
1989: 1st: Hakeem Olajuwon, Charles Barkley, Karl Malone, Magic Johnson, Michael Jordan | 2nd: Patrick Ewing, Tom Chambers, Chris Mullin, Kevin Johnson, John Stockton | 3rd: Robert Parish, Terry Cummings, Dominique Wilkins, Dale Ellis, Mark Price
1990: 1st: Patrick Ewing, Charles Barkley, Karl Malone, Magic Johnson, Michael Jordan | 2nd: Hakeem Olajuwon, Larry Bird, Tom Chambers, Kevin Johnson, John Stockton | 3rd: David Robinson, Chris Mullin, James Worthy, Clyde Drexler, Joe Dumars
1991: 1st: David Robinson, Charles Barkley, Karl Malone, Magic Johnson, Michael Jordan | 2nd: Patrick Ewing, Chris Mullin, Dominique Wilkins, Clyde Drexler, Kevin Johnson | 3rd: Hakeem Olajuwon, Bernard King, James Worthy, Joe Dumars, John Stockton
1992: 1st: David Robinson, Karl Malone, Chris Mullin, Clyde Drexler, Michael Jordan | 2nd: Patrick Ewing, Charles Barkley, Scottie Pippen, Tim Hardaway, John Stockton | 3rd: Brad Daugherty, Dennis Rodman, Kevin Willis, Kevin Johnson, Mark Price
1993: 1st: Hakeem Olajuwon, Charles Barkley, Karl Malone, Michael Jordan, Mark Price | 2nd: Patrick Ewing, Larry Johnson, Dominique Wilkins, Joe Dumars, John Stockton | 3rd: David Robinson, Derrick Coleman, Scottie Pippen, Tim Hardaway, Dražen Petrović
1994: 1st: Hakeem Olajuwon, Karl Malone, Scottie Pippen, Latrell Sprewell, John Stockton | 2nd: David Robinson, Charles Barkley, Shawn Kemp, Kevin Johnson, Mitch Richmond | 3rd: Shaquille O'Neal, Derrick Coleman, Dominique Wilkins, Gary Payton, Mark Price
1995: 1st: David Robinson, Karl Malone, Scottie Pippen, Anfernee Hardaway, John Stockton | 2nd: Shaquille O'Neal, Charles Barkley, Shawn Kemp, Gary Payton, Mitch Richmond | 3rd: Hakeem Olajuwon, Dennis Rodman, Detlef Schrempf, Clyde Drexler, Reggie Miller
1996: 1st: David Robinson, Karl Malone, Scottie Pippen, Anfernee Hardaway, Michael Jordan | 2nd: Hakeem Olajuwon, Grant Hill, Shawn Kemp, Gary Payton, John Stockton | 3rd: Shaquille O'Neal, Charles Barkley, Juwan Howard, Reggie Miller, Mitch Richmond
1997: 1st: Hakeem Olajuwon, Grant Hill, Karl Malone, Tim Hardaway, Michael Jordan | 2nd: Patrick Ewing, Scottie Pippen, Glen Rice, Gary Payton, Mitch Richmond | 3rd: Shaquille O'Neal, Vin Baker, Anthony Mason, Anfernee Hardaway, John Stockton
1998: 1st: Shaquille O'Neal, Tim Duncan, Karl Malone, Michael Jordan, Gary Payton | 2nd: David Robinson, Vin Baker, Grant Hill, Tim Hardaway, Rod Strickland | 3rd: Dikembe Mutombo, Scottie Pippen, Glen Rice, Reggie Miller, Mitch Richmond
1999: 1st: Alonzo Mourning, Tim Duncan, Karl Malone, Allen Iverson, Jason Kidd | 2nd: Shaquille O'Neal, Grant Hill, Chris Webber, Tim Hardaway, Gary Payton | 3rd: Hakeem Olajuwon, Kevin Garnett, Antonio McDyess, Kobe Bryant, John Stockton
2000: 1st: Shaquille O'Neal, Tim Duncan, Kevin Garnett, Jason Kidd, Gary Payton | 2nd: Alonzo Mourning, Grant Hill, Karl Malone, Kobe Bryant, Allen Iverson | 3rd: David Robinson, Vince Carter, Chris Webber, Eddie Jones, Stephon Marbury
2001: 1st: Shaquille O'Neal, Tim Duncan, Chris Webber, Allen Iverson, Jason Kidd | 2nd: Dikembe Mutombo, Vince Carter, Kevin Garnett, Kobe Bryant, Tracy McGrady | 3rd: David Robinson, Karl Malone, Dirk Nowitzki, Ray Allen, Gary Payton
2002: 1st: Shaquille O'Neal, Tim Duncan, Tracy McGrady, Kobe Bryant, Jason Kidd | 2nd: Dirk Nowitzki, Kevin Garnett, Chris Webber, Allen Iverson, Gary Payton | 3rd: Dikembe Mutombo, Jermaine O'Neal, Ben Wallace, Steve Nash, Paul Pierce
2003: 1st: Shaquille O'Neal, Tim Duncan, Kevin Garnett, Kobe Bryant, Tracy McGrady | 2nd: Ben Wallace, Dirk Nowitzki, Chris Webber, Allen Iverson, Jason Kidd | 3rd: Jermaine O'Neal, Jamal Mashburn, Paul Pierce, Stephon Marbury, Steve Nash
2004: 1st: Shaquille O'Neal, Tim Duncan, Kevin Garnett, Kobe Bryant, Jason Kidd | 2nd: Ben Wallace, Jermaine O'Neal, Peja Stojaković, Sam Cassell, Tracy McGrady | 3rd: Yao Ming, Metta World Peace, Dirk Nowitzki, Baron Davis, Michael Redd
2005: 1st: Shaquille O'Neal, Tim Duncan, Dirk Nowitzki, Allen Iverson, Steve Nash | 2nd: Amar'e Stoudemire, Kevin Garnett, LeBron James, Ray Allen, Dwyane Wade | 3rd: Ben Wallace, Shawn Marion, Tracy McGrady, Gilbert Arenas, Kobe Bryant
2006: 1st: Shaquille O'Neal, LeBron James, Dirk Nowitzki, Kobe Bryant, Steve Nash | 2nd: Ben Wallace, Elton Brand, Tim Duncan, Chauncey Billups, Dwyane Wade | 3rd: Yao Ming, Carmelo Anthony, Shawn Marion, Gilbert Arenas, Allen Iverson
2007: 1st: Amar'e Stoudemire, Tim Duncan, Dirk Nowitzki, Kobe Bryant, Steve Nash | 2nd: Yao Ming, Chris Bosh, LeBron James, Gilbert Arenas, Tracy McGrady | 3rd: Dwight Howard, Carmelo Anthony, Kevin Garnett, Chauncey Billups, Dwyane Wade
2008: 1st: Dwight Howard, Kevin Garnett, LeBron James, Kobe Bryant, Chris Paul | 2nd: Amar'e Stoudemire, Tim Duncan, Dirk Nowitzki, Steve Nash, Deron Williams | 3rd: Yao Ming, Carlos Boozer, Paul Pierce, Manu Ginóbili, Tracy McGrady
2009: 1st: Dwight Howard, LeBron James, Dirk Nowitzki, Kobe Bryant, Dwyane Wade | 2nd: Yao Ming, Tim Duncan, Paul Pierce, Chris Paul, Brandon Roy | 3rd: Shaquille O'Neal, Carmelo Anthony, Pau Gasol, Chauncey Billups, Tony Parker
2010: 1st: Dwight Howard, Kevin Durant, LeBron James, Kobe Bryant, Dwyane Wade | 2nd: Amar'e Stoudemire, Carmelo Anthony, Dirk Nowitzki, Steve Nash, Deron Williams | 3rd: Andrew Bogut, Tim Duncan, Pau Gasol, Joe Johnson, Brandon Roy
2011: 1st: Dwight Howard, Kevin Durant, LeBron James, Kobe Bryant, Derrick Rose | 2nd: Amar'e Stoudemire, Pau Gasol, Dirk Nowitzki, Dwyane Wade, Russell Westbrook | 3rd: Al Horford, LaMarcus Aldridge, Zach Randolph, Manu Ginóbili, Chris Paul
2012: 1st: Dwight Howard, Kevin Durant, LeBron James, Kobe Bryant, Chris Paul | 2nd: Andrew Bynum, Blake Griffin, Kevin Love, Tony Parker, Russell Westbrook | 3rd: Tyson Chandler, Carmelo Anthony, Dirk Nowitzki, Rajon Rondo, Dwyane Wade
2013: 1st: Tim Duncan, Kevin Durant, LeBron James, Kobe Bryant, Chris Paul | 2nd: Marc Gasol, Carmelo Anthony, Blake Griffin, Tony Parker, Russell Westbrook | 3rd: Dwight Howard, Paul George, David Lee, James Harden, Dwyane Wade
2014: 1st: Joakim Noah, Kevin Durant, LeBron James, James Harden, Chris Paul | 2nd: Dwight Howard, Blake Griffin, Kevin Love, Stephen Curry, Tony Parker | 3rd: Al Jefferson, Paul George, LaMarcus Aldridge, Goran Dragić, Damian Lillard
2015: 1st: Marc Gasol, LeBron James, Anthony Davis, Stephen Curry, James Harden | 2nd: Pau Gasol, LaMarcus Aldridge, DeMarcus Cousins, Russell Westbrook, Chris Paul | 3rd: DeAndre Jordan, Blake Griffin, Tim Duncan, Klay Thompson, Kyrie Irving
2016: 1st: DeAndre Jordan, LeBron James, Kawhi Leonard, Stephen Curry, Russell Westbrook | 2nd: DeMarcus Cousins, Kevin Durant, Draymond Green, Chris Paul, Damian Lillard | 3rd: Andre Drummond, Paul George, LaMarcus Aldridge, Klay Thompson, Kyle Lowry
2017: 1st: Anthony Davis, LeBron James, Kawhi Leonard, James Harden, Russell Westbrook | 2nd: Rudy Gobert, Giannis Antetokounmpo, Kevin Durant, Stephen Curry, Isaiah Thomas | 3rd: DeAndre Jordan, Draymond Green, Jimmy Butler, John Wall, DeMar DeRozan
2018: 1st: Anthony Davis, LeBron James, Kevin Durant, Damian Lillard, James Harden | 2nd: Joel Embiid, Giannis Antetokounmpo, LaMarcus Aldridge, Russell Westbrook, DeMar DeRozan | 3rd: Karl-Anthony Towns, Jimmy Butler, Paul George, Stephen Curry, Victor Oladipo
2019: 1st: Nikola Jokić, Giannis Antetokounmpo, Paul George, James Harden, Stephen Curry | 2nd: Joel Embiid, Kevin Durant, Kawhi Leonard, Damian Lillard, Kyrie Irving | 3rd: Rudy Gobert, LeBron James, Blake Griffin, Kemba Walker, Russell Westbrook
2020: 1st: Anthony Davis, Giannis Antetokounmpo, LeBron James, James Harden, Luka Dončić | 2nd: Nikola Jokić, Kawhi Leonard, Pascal Siakam, Damian Lillard, Chris Paul | 3rd: Rudy Gobert, Jayson Tatum, Jimmy Butler, Ben Simmons, Russell Westbrook
2021: 1st: Nikola Jokić, Giannis Antetokounmpo, Kawhi Leonard, Stephen Curry, Luka Dončić | 2nd: Joel Embiid, Julius Randle, LeBron James, Chris Paul, Damian Lillard | 3rd: Rudy Gobert, Jimmy Butler, Paul George, Bradley Beal, Kyrie Irving
2022: 1st: Nikola Jokić, Giannis Antetokounmpo, Jayson Tatum, Luka Dončić, Devin Booker | 2nd: Joel Embiid, Kevin Durant, DeMar DeRozan, Ja Morant, Stephen Curry | 3rd: Karl-Anthony Towns, LeBron James, Pascal Siakam, Chris Paul, Trae Young
2023: 1st: Joel Embiid, Giannis Antetokounmpo, Jayson Tatum, Luka Dončić, Shai Gilgeous-Alexander | 2nd: Nikola Jokić, Jimmy Butler, Jaylen Brown, Donovan Mitchell, Stephen Curry | 3rd: Domantas Sabonis, LeBron James, Julius Randle, De'Aaron Fox, Damian Lillard
2024: 1st: Nikola Jokić, Giannis Antetokounmpo, Jayson Tatum, Luka Dončić, Shai Gilgeous-Alexander | 2nd: Anthony Davis, Kevin Durant, Kawhi Leonard, Jalen Brunson, Anthony Edwards | 3rd: LeBron James, Domantas Sabonis, Devin Booker, Stephen Curry, Tyrese Haliburton
2025: 1st: Nikola Jokić, Giannis Antetokounmpo, Jayson Tatum, Shai Gilgeous-Alexander, Donovan Mitchell | 2nd: Evan Mobley, LeBron James, Stephen Curry, Anthony Edwards, Jalen Brunson | 3rd: Karl-Anthony Towns, Jalen Williams, Cade Cunningham, Tyrese Haliburton, James Harden
2026: 1st: Nikola Jokić, Victor Wembanyama, Shai Gilgeous-Alexander, Luka Dončić, Cade Cunningham | 2nd: Jaylen Brown, Kawhi Leonard, Kevin Durant, Donovan Mitchell, Jalen Brunson | 3rd: Jalen Duren, Jalen Johnson, Chet Holmgren, Tyrese Maxey, Jamal Murray
`;

// BBRef name → card name
export const ALIASES = {
  'Tiny Archibald': 'Nate Archibald',
  'Anfernee Hardaway': 'Penny Hardaway',
  'Metta World Peace': 'Ron Artest',
};

export function parseAllNba() {
  const out = []; // { year, team: 1|2|3, name }
  for (const line of ALL_NBA_RAW.trim().split('\n')) {
    const [y, rest] = line.split(/:\s(.+)/);
    rest.split('|').forEach((chunk) => {
      const [label, names] = chunk.split(/:\s/);
      const team = parseInt(label.trim(), 10);
      for (const n of names.split(',')) {
        const name = n.trim();
        out.push({ year: +y, team, name: ALIASES[name] ?? name });
      }
    });
  }
  return out;
}

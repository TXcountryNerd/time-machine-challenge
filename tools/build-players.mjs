// Builds data/players.json from the hand-rated table below, checks eligibility,
// cross-checks ratings against All-NBA history, and prints a depth report.
// Run: node tools/build-players.mjs
//
// ELIGIBILITY (player must appear in at least one):
//   - All-NBA team, 1980–2026 (Basketball-Reference, see all-nba.mjs)
//   - Hall of Fame or NBA 75th Anniversary Team, played 1980+
//   - Sixth Man of the Year or Defensive Player of the Year winner (added to deepen
//     the bank with real role players, so late picks can leave you "stuck")
// ERAS: decade of the season END year (1979-80 = '80s). A player gets a card for each
//   decade where he played meaningful minutes (roughly 2+ seasons, or an award season).
// RATINGS: hand-set per decade, anchored to that decade's All-NBA record, MVP/DPOY
//   voting and Basketball-Reference advanced stats (PER, WS/48, BPM), then judgment.
//
// Line format: Name|POS|ERA|ovr three def play inside rebounding clutch durability usage
// (usage = ball-dominance 1–99, drives chemistry)

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAllNba } from './all-nba.mjs';

const RAW = `
Magic Johnson|PG|80s|98 60 72 99 86 82 95 88 90
Isiah Thomas|PG|80s|92 70 75 93 80 50 95 85 90
John Stockton|PG|80s|88 70 82 96 70 45 82 99 70
Maurice Cheeks|PG|80s|84 45 88 86 70 45 78 90 60
Nate Archibald|PG|80s|82 50 60 88 78 35 80 70 80
Gus Williams|PG|80s|87 55 75 82 82 45 84 82 84
Mark Price|PG|80s|85 88 65 88 70 40 85 75 78
Kevin Johnson|PG|80s|86 60 70 90 88 45 84 78 85
Fat Lever|PG|80s|84 55 82 85 70 75 75 85 70
Dennis Johnson|PG|80s|87 55 92 82 75 55 90 88 70
Calvin Murphy|PG|80s|79 75 60 78 75 30 85 80 78
Jo Jo White|PG|80s|74 40 65 80 70 35 75 70 70
Michael Jordan|SG|80s|99 60 95 85 97 70 99 92 99
Clyde Drexler|SG|80s|89 65 80 82 92 80 84 88 85
George Gervin|SG|80s|92 60 60 70 95 55 88 85 96
Sidney Moncrief|SG|80s|90 55 95 75 86 65 84 70 75
Alvin Robertson|SG|80s|84 55 95 78 72 70 72 85 70
Joe Dumars|SG|80s|83 70 92 75 72 40 86 90 70
Reggie Miller|SG|80s|81 92 62 65 60 40 88 92 72
Paul Westphal|SG|80s|83 62 65 80 84 35 84 60 84
David Thompson|SG|80s|80 45 55 70 90 55 78 50 85
Mitch Richmond|SG|80s|81 72 65 70 82 55 80 85 80
Dale Ellis|SG|80s|82 92 55 55 72 50 78 85 80
Pete Maravich|SG|80s|76 65 45 85 78 35 80 40 88
Earl Monroe|SG|80s|75 40 55 78 80 35 82 55 78
Michael Cooper|SG|80s|80 72 96 72 60 50 82 88 40
Jim Paxson|SG|80s|80 55 70 70 82 40 75 85 75
Otis Birdsong|SG|80s|81 45 65 70 85 45 76 75 80
Ricky Pierce|SG|80s|79 65 55 60 82 40 82 82 75
Larry Bird|SF|80s|98 88 82 92 90 88 99 82 92
Julius Erving|SF|80s|93 40 80 82 95 78 92 85 90
Dominique Wilkins|SF|80s|91 55 62 65 97 75 88 88 98
Alex English|SF|80s|88 35 62 72 90 60 82 92 90
Bernard King|SF|80s|89 35 55 60 96 60 86 60 96
Adrian Dantley|SF|80s|88 35 55 62 95 70 82 75 90
James Worthy|SF|80s|87 35 72 70 90 65 94 84 80
Scottie Pippen|SF|80s|80 55 88 78 75 72 70 85 62
Chris Mullin|SF|80s|85 80 65 75 82 55 80 75 82
Marques Johnson|SF|80s|86 40 70 78 88 72 80 72 85
Jamaal Wilkes|SF|80s|81 35 75 65 85 62 80 82 72
Bob Dandridge|SF|80s|76 30 72 68 78 60 78 65 68
Rick Barry|SF|80s|77 72 62 82 72 55 85 65 70
Eddie Johnson|SF|80s|81 72 50 60 85 50 80 85 82
Karl Malone|PF|80s|89 25 78 68 94 90 76 99 88
Charles Barkley|PF|80s|94 50 65 78 96 97 84 84 92
Kevin McHale|PF|80s|90 25 85 65 96 82 84 82 82
Dennis Rodman|PF|80s|81 25 96 50 55 92 70 82 25
Tom Chambers|PF|80s|84 45 55 60 88 72 78 80 85
Buck Williams|PF|80s|83 15 80 45 78 92 70 92 55
Terry Cummings|PF|80s|84 25 62 60 88 82 75 80 85
Bobby Jones|PF|80s|81 25 95 62 72 72 78 82 45
Elvin Hayes|PF|80s|80 20 75 50 82 86 70 98 78
Dan Issel|PF|80s|79 30 50 60 85 75 78 92 78
Spencer Haywood|PF|80s|75 25 62 55 80 76 70 60 68
George McGinnis|PF|80s|74 15 60 65 78 78 70 60 72
Dan Roundfield|PF|80s|82 20 85 55 78 88 72 82 65
Roy Tarpley|PF|80s|79 20 72 55 80 95 70 50 65
Kareem Abdul-Jabbar|C|80s|96 20 85 75 98 85 96 95 90
Moses Malone|C|80s|96 15 72 55 96 99 85 92 88
Hakeem Olajuwon|C|80s|93 20 95 60 93 93 82 88 82
Patrick Ewing|C|80s|88 25 88 50 88 85 78 85 82
Robert Parish|C|80s|88 15 85 55 84 90 80 99 65
Bill Walton|C|80s|78 15 88 85 72 85 75 30 55
Artis Gilmore|C|80s|83 10 82 45 86 90 70 85 70
Jack Sikma|C|80s|84 55 78 65 80 88 75 88 70
Bob Lanier|C|80s|81 25 70 60 85 82 75 55 74
Ralph Sampson|C|80s|84 30 82 62 85 88 72 55 78
Bob McAdoo|C|80s|79 30 65 55 85 75 78 60 72
Dave Cowens|C|80s|73 25 72 65 70 80 75 50 55
Wes Unseld|C|80s|75 5 80 78 58 92 72 70 35
Mark Eaton|C|80s|80 5 99 30 55 90 60 90 20

John Stockton|PG|90s|93 80 85 99 70 40 86 99 75
Gary Payton|PG|90s|93 70 99 88 82 55 85 95 82
Tim Hardaway|PG|90s|91 82 70 92 78 40 86 82 88
Kevin Johnson|PG|90s|89 65 72 92 88 45 86 72 86
Mark Price|PG|90s|88 92 65 90 70 40 85 70 80
Jason Kidd|PG|90s|90 60 90 97 70 82 82 90 72
Penny Hardaway|PG|90s|91 70 82 92 86 60 85 65 86
Magic Johnson|PG|90s|92 70 70 98 80 75 92 75 85
Isiah Thomas|PG|90s|85 70 72 90 78 45 90 72 84
Rod Strickland|PG|90s|84 45 70 92 82 55 75 82 80
Steve Nash|PG|90s|77 88 50 82 60 35 75 85 58
Sam Cassell|PG|90s|82 72 60 82 82 40 92 78 80
Darrell Armstrong|PG|90s|76 70 72 76 68 40 75 82 60
Michael Jordan|SG|90s|99 72 96 85 96 70 99 95 99
Clyde Drexler|SG|90s|91 68 80 82 90 78 85 85 85
Reggie Miller|SG|90s|88 96 65 68 62 40 97 92 80
Mitch Richmond|SG|90s|88 85 70 72 84 50 84 88 85
Joe Dumars|SG|90s|86 80 90 75 74 35 86 88 72
Allen Iverson|SG|90s|90 70 72 82 92 45 88 82 98
Kobe Bryant|SG|90s|85 75 80 72 86 55 85 92 86
Latrell Sprewell|SG|90s|86 65 85 70 85 50 80 85 84
Vince Carter|SG|90s|84 78 65 68 92 60 82 85 84
Ray Allen|SG|90s|84 92 65 70 72 50 85 92 80
Drazen Petrovic|SG|90s|84 95 50 70 75 35 85 85 82
Sarunas Marciulionis|SG|90s|80 55 60 72 86 45 78 60 75
Dell Curry|SG|90s|77 90 50 60 65 35 78 85 70
John Starks|SG|90s|80 80 80 68 72 40 72 82 78
Ricky Pierce|SG|90s|79 72 50 62 80 35 84 78 72
Eddie Jones|SG|90s|83 80 90 70 75 50 78 85 72
Scottie Pippen|SF|90s|94 65 99 88 85 80 82 88 78
Grant Hill|SF|90s|92 40 82 90 90 80 82 80 88
Chris Mullin|SF|90s|89 88 65 78 82 50 82 80 82
Dominique Wilkins|SF|90s|88 65 60 62 92 72 85 85 95
Larry Bird|SF|90s|88 85 70 90 78 85 92 45 82
Glen Rice|SF|90s|86 92 55 62 78 50 85 90 85
Paul Pierce|SF|90s|79 72 70 70 80 60 78 85 78
James Worthy|SF|90s|85 40 70 70 86 60 90 80 80
Bernard King|SF|90s|82 35 50 60 92 55 80 55 92
Detlef Schrempf|SF|90s|84 75 70 80 80 75 78 85 72
Toni Kukoc|SF|90s|83 75 55 88 75 60 88 82 72
Danny Manning|SF|90s|83 30 70 72 85 75 74 55 78
Eddie Johnson|SF|90s|78 78 45 55 78 45 80 80 75
Rodney Rogers|SF|90s|76 65 60 62 78 62 72 80 68
Jamal Mashburn|SF|90s|82 65 55 68 85 60 78 65 85
Karl Malone|PF|90s|96 30 82 72 95 90 75 99 90
Charles Barkley|PF|90s|94 65 65 80 94 94 84 82 90
Dennis Rodman|PF|90s|86 25 98 50 40 99 72 80 15
Tim Duncan|PF|90s|94 25 92 72 92 92 88 92 82
Kevin Garnett|PF|90s|87 45 88 75 82 88 76 92 78
Chris Webber|PF|90s|87 40 72 82 88 88 72 72 84
Shawn Kemp|PF|90s|88 25 72 55 92 90 75 82 82
Derrick Coleman|PF|90s|84 55 62 65 85 85 70 72 80
Kevin McHale|PF|90s|83 30 80 60 90 75 80 60 72
Larry Johnson|PF|90s|85 55 62 70 88 82 80 72 82
Tom Chambers|PF|90s|84 55 55 62 86 70 78 80 84
Kevin Willis|PF|90s|82 20 70 50 80 92 70 90 70
Juwan Howard|PF|90s|83 15 65 70 85 82 75 85 78
Vin Baker|PF|90s|84 20 68 60 88 85 72 82 82
Anthony Mason|PF|90s|82 10 85 80 72 85 70 92 55
Antonio McDyess|PF|90s|82 20 78 50 84 88 70 75 72
Hakeem Olajuwon|C|90s|97 30 98 70 98 92 94 90 90
David Robinson|C|90s|95 25 96 68 94 94 82 88 88
Shaquille O'Neal|C|90s|95 5 75 60 99 95 80 82 95
Patrick Ewing|C|90s|92 30 88 55 92 88 82 88 88
Alonzo Mourning|C|90s|90 20 94 45 88 86 80 75 80
Dikembe Mutombo|C|90s|85 5 99 30 72 95 65 92 40
Robert Parish|C|90s|80 15 80 50 78 85 72 95 55
Brad Daugherty|C|90s|84 20 72 75 86 88 72 50 78
Arvydas Sabonis|C|90s|84 65 72 88 82 85 72 50 70
Vlade Divac|C|90s|83 35 72 85 78 82 72 90 62
Moses Malone|C|90s|77 10 55 45 82 85 72 65 68
Clifford Robinson|C|90s|81 65 78 60 78 72 72 92 72
Mark Eaton|C|90s|76 5 95 30 50 82 55 75 20
Marcus Camby|C|90s|78 10 92 45 70 85 62 55 55

Jason Kidd|PG|00s|92 70 90 97 65 82 82 90 72
Steve Nash|PG|00s|93 97 55 99 72 35 88 85 85
Allen Iverson|PG|00s|92 68 72 85 95 45 90 85 99
Chris Paul|PG|00s|92 82 92 96 75 50 88 85 85
Tony Parker|PG|00s|87 50 70 88 92 35 85 88 84
Chauncey Billups|PG|00s|88 88 80 87 75 40 97 90 80
Gary Payton|PG|00s|88 72 92 86 78 50 84 90 80
Deron Williams|PG|00s|87 82 70 92 82 40 86 85 85
Gilbert Arenas|PG|00s|87 88 62 80 88 45 92 50 95
Stephon Marbury|PG|00s|85 75 60 88 85 40 80 82 88
Baron Davis|PG|00s|85 75 75 88 82 50 85 65 88
Derrick Rose|PG|00s|80 50 62 80 90 45 80 82 85
Sam Cassell|PG|00s|84 75 60 85 82 40 95 80 82
Jason Terry|PG|00s|83 90 60 78 75 35 90 88 78
Bobby Jackson|PG|00s|77 72 72 70 75 50 80 65 72
Rajon Rondo|PG|00s|80 30 88 90 70 65 82 85 65
John Stockton|PG|00s|84 78 72 92 62 35 82 95 60
Kobe Bryant|SG|00s|97 82 90 85 95 60 99 92 99
Dwyane Wade|SG|00s|94 50 88 85 97 65 95 75 96
Tracy McGrady|SG|00s|94 80 78 85 95 70 90 70 97
Ray Allen|SG|00s|89 97 70 72 75 50 94 92 82
Vince Carter|SG|00s|89 82 68 72 92 60 88 85 90
Manu Ginobili|SG|00s|88 82 82 85 85 55 92 75 75
Reggie Miller|SG|00s|84 92 60 65 58 35 94 85 72
Michael Jordan|SG|00s|84 55 75 82 85 60 90 70 95
Brandon Roy|SG|00s|86 78 72 82 85 45 92 50 85
Michael Redd|SG|00s|84 90 50 60 80 45 82 70 88
Joe Johnson|SG|00s|84 85 70 75 80 50 90 92 82
Mitch Richmond|SG|00s|77 82 60 62 72 45 78 70 72
Eddie Jones|SG|00s|84 82 88 70 75 50 78 80 72
Ben Gordon|SG|00s|81 90 45 60 78 35 90 85 80
Leandro Barbosa|SG|00s|79 82 50 62 80 35 75 80 72
Jamal Crawford|SG|00s|81 80 45 75 82 35 88 92 85
Aaron McKie|SG|00s|76 72 82 72 62 50 75 80 55
J.R. Smith|SG|00s|78 85 55 60 75 45 78 82 75
LeBron James|SF|00s|97 72 85 95 98 82 90 97 98
Paul Pierce|SF|00s|90 85 78 78 88 65 95 90 90
Carmelo Anthony|SF|00s|89 78 55 70 95 70 92 85 95
Grant Hill|SF|00s|84 40 75 82 84 72 78 30 78
Kevin Durant|SF|00s|86 85 55 65 90 70 82 92 90
Shawn Marion|SF|00s|87 75 88 65 82 90 72 90 60
Peja Stojakovic|SF|00s|86 95 55 60 75 55 88 72 80
Scottie Pippen|SF|00s|80 65 88 82 68 70 78 60 62
Ron Artest|SF|00s|84 75 98 60 78 62 78 75 70
Jamal Mashburn|SF|00s|84 72 55 72 85 60 80 55 88
Antawn Jamison|SF|00s|85 72 50 60 85 80 76 90 82
Mike Miller|SF|00s|79 90 55 70 65 62 75 72 65
Lamar Odom|SF|00s|84 55 75 82 78 85 72 85 68
Toni Kukoc|SF|00s|78 72 50 82 68 55 82 65 65
Glen Rice|SF|00s|77 88 45 55 70 45 80 60 72
Tim Duncan|PF|00s|98 25 96 78 94 94 92 95 85
Kevin Garnett|PF|00s|96 40 97 80 88 95 82 92 82
Dirk Nowitzki|PF|00s|95 88 62 70 88 82 94 92 90
Chris Webber|PF|00s|90 35 72 86 90 90 72 60 86
Pau Gasol|PF|00s|87 40 78 80 88 85 82 88 75
Amar'e Stoudemire|PF|00s|90 30 60 50 96 82 78 72 86
Chris Bosh|PF|00s|87 45 75 62 88 85 78 88 80
Jermaine O'Neal|PF|00s|86 25 85 50 85 85 72 65 80
Elton Brand|PF|00s|87 15 82 55 88 88 75 70 80
Karl Malone|PF|00s|87 30 78 72 86 84 72 88 80
Carlos Boozer|PF|00s|85 10 60 60 88 92 72 70 80
Corliss Williamson|PF|00s|76 10 60 50 82 70 72 82 70
Rodney Rogers|PF|00s|77 70 60 62 76 65 74 82 65
Antonio McDyess|PF|00s|82 35 75 50 82 88 70 65 70
Juwan Howard|PF|00s|79 25 62 62 80 78 72 85 70
David Lee|PF|00s|80 10 55 70 80 92 65 92 65
Shaquille O'Neal|C|00s|97 5 82 65 99 95 82 80 95
Dwight Howard|C|00s|91 5 94 40 90 98 65 95 68
Yao Ming|C|00s|89 30 82 55 90 88 78 50 80
Ben Wallace|C|00s|88 10 99 45 45 97 70 90 15
Alonzo Mourning|C|00s|83 15 90 40 80 82 72 50 62
Dikembe Mutombo|C|00s|84 5 95 30 62 95 62 78 30
David Robinson|C|00s|84 20 88 60 80 88 75 75 60
Hakeem Olajuwon|C|00s|76 20 82 55 76 75 72 50 58
Vlade Divac|C|00s|79 40 68 85 70 75 70 75 55
Arvydas Sabonis|C|00s|78 70 65 88 72 75 70 45 55
Patrick Ewing|C|00s|76 30 70 50 75 75 70 60 60
Marcus Camby|C|00s|84 15 95 62 70 95 65 70 50
Clifford Robinson|C|00s|78 72 75 60 72 65 72 88 62
Tyson Chandler|C|00s|80 5 88 40 72 95 65 72 30
Al Jefferson|C|00s|82 5 55 45 88 88 68 75 80
Andrew Bogut|C|00s|80 10 85 72 76 90 65 70 55

Stephen Curry|PG|10s|97 99 72 92 88 50 96 82 92
Chris Paul|PG|10s|92 85 90 97 75 50 90 78 85
Russell Westbrook|PG|10s|92 60 78 92 94 85 85 92 99
Damian Lillard|PG|10s|91 92 60 85 85 45 98 92 92
Kyrie Irving|PG|10s|89 88 60 85 95 40 96 68 92
Tony Parker|PG|10s|87 60 65 85 90 35 85 82 84
Derrick Rose|PG|10s|87 60 65 82 94 45 86 40 94
Steve Nash|PG|10s|85 95 45 95 65 35 82 55 75
John Wall|PG|10s|86 50 82 92 88 50 80 60 88
Kyle Lowry|PG|10s|86 85 85 85 75 50 82 88 75
Deron Williams|PG|10s|85 80 60 88 78 40 80 70 82
Jason Kidd|PG|10s|78 82 78 85 45 65 75 75 45
Kemba Walker|PG|10s|85 85 55 80 85 40 90 82 90
Rajon Rondo|PG|10s|84 40 85 96 65 70 85 70 75
Goran Dragic|PG|10s|83 78 60 82 85 40 80 80 80
Isaiah Thomas|PG|10s|84 85 40 80 90 30 94 60 95
Ben Simmons|PG|10s|85 5 88 92 85 85 65 80 75
Luka Doncic|PG|10s|85 70 55 90 80 80 85 85 92
James Harden|SG|10s|96 90 65 92 94 65 88 92 99
Dwyane Wade|SG|10s|90 55 82 85 92 60 92 70 90
Kobe Bryant|SG|10s|92 80 72 82 92 55 96 60 98
Klay Thompson|SG|10s|88 97 85 60 72 45 85 85 70
DeMar DeRozan|SG|10s|86 50 65 78 88 50 86 90 88
Manu Ginobili|SG|10s|82 80 72 82 72 45 85 65 65
Ray Allen|SG|10s|82 94 60 62 60 40 92 75 65
Vince Carter|SG|10s|76 82 70 62 65 50 78 85 55
Joe Johnson|SG|10s|83 85 65 72 78 45 92 85 78
Victor Oladipo|SG|10s|84 75 88 72 82 55 80 55 82
Brandon Roy|SG|10s|83 78 70 80 82 45 92 30 82
Jamal Crawford|SG|10s|80 82 40 72 78 30 88 92 82
Lou Williams|SG|10s|82 80 40 75 82 30 90 85 88
J.R. Smith|SG|10s|80 88 65 60 68 45 78 85 68
Eric Gordon|SG|10s|81 90 60 62 75 35 80 60 75
Jason Terry|SG|10s|78 88 55 68 65 30 86 85 65
Jordan Clarkson|SG|10s|77 78 45 62 78 35 74 85 78
Marcus Smart|SG|10s|78 62 95 72 60 55 82 75 50
Malcolm Brogdon|SG|10s|80 85 70 72 75 50 80 65 65
Donovan Mitchell|SG|10s|85 82 65 72 85 45 84 85 92
Devin Booker|SG|10s|85 85 50 75 85 45 85 80 92
LeBron James|SF|10s|99 78 88 97 98 85 95 95 98
Kevin Durant|SF|10s|97 92 78 82 95 80 95 85 95
Kawhi Leonard|SF|10s|94 85 99 75 88 75 96 70 85
Paul George|SF|10s|90 87 92 75 82 70 82 72 85
Carmelo Anthony|SF|10s|89 80 55 68 93 72 88 80 94
Paul Pierce|SF|10s|82 85 70 72 75 60 92 85 72
Grant Hill|SF|10s|72 65 72 70 65 60 70 55 50
Jimmy Butler|SF|10s|87 70 92 78 85 62 88 82 82
Lamar Odom|SF|10s|80 55 70 82 72 80 70 75 60
Mike Miller|SF|10s|73 90 50 62 55 55 75 50 45
Jayson Tatum|SF|10s|83 80 75 65 82 65 80 88 78
Jaylen Brown|SF|10s|79 72 75 55 78 55 72 85 68
Dirk Nowitzki|PF|10s|89 90 55 65 82 75 95 80 85
Tim Duncan|PF|10s|89 25 92 75 82 88 85 85 70
Kevin Garnett|PF|10s|84 40 90 75 72 85 78 75 65
Blake Griffin|PF|10s|89 65 65 82 92 85 78 65 88
Anthony Davis|PF|10s|93 40 95 65 92 92 80 60 88
Giannis Antetokounmpo|PF|10s|94 45 92 82 99 92 82 90 95
Kevin Love|PF|10s|87 82 60 72 82 95 72 65 78
LaMarcus Aldridge|PF|10s|88 50 75 60 90 82 80 85 86
Chris Bosh|PF|10s|86 78 78 60 82 78 82 70 72
Pau Gasol|PF|10s|87 45 74 80 84 90 78 80 72
Draymond Green|PF|10s|86 60 97 90 60 82 82 85 50
Zach Randolph|PF|10s|84 20 62 55 88 95 75 80 80
David Lee|PF|10s|83 10 55 72 80 92 65 85 70
Amar'e Stoudemire|PF|10s|85 30 55 50 92 80 75 55 85
Montrezl Harrell|PF|10s|80 10 62 50 88 72 70 85 72
Antawn Jamison|PF|10s|76 70 40 55 75 70 70 70 70
Pascal Siakam|PF|10s|83 65 82 65 85 72 75 90 70
Carlos Boozer|PF|10s|81 10 55 55 82 90 68 75 70
Dwight Howard|C|10s|92 5 95 40 88 98 62 80 74
DeMarcus Cousins|C|10s|88 50 70 72 92 92 75 65 92
Joel Embiid|C|10s|90 60 92 65 94 92 82 50 92
Nikola Jokic|C|10s|92 70 70 98 90 92 85 92 82
Rudy Gobert|C|10s|86 5 98 40 75 95 60 90 40
Marc Gasol|C|10s|87 60 93 85 78 78 80 85 65
Andre Drummond|C|10s|82 10 80 45 78 99 55 92 60
DeAndre Jordan|C|10s|85 5 92 40 78 98 50 95 45
Al Horford|C|10s|83 65 85 78 78 80 78 75 60
Joakim Noah|C|10s|85 10 93 84 70 92 70 65 55
Andrew Bynum|C|10s|82 10 85 45 85 90 65 40 72
Karl-Anthony Towns|C|10s|87 85 65 72 90 92 75 90 85
Andrew Bogut|C|10s|83 10 92 82 70 88 65 50 45
Tyson Chandler|C|10s|84 5 92 40 75 92 70 75 30
Al Jefferson|C|10s|84 5 55 45 92 88 70 65 82
Shaquille O'Neal|C|10s|72 5 60 50 78 72 60 30 55
Marcus Camby|C|10s|74 10 85 55 55 88 55 50 30
Ben Wallace|C|10s|70 5 85 40 35 78 55 60 10

Stephen Curry|PG|20s|95 99 70 90 85 50 97 78 92
Luka Doncic|PG|20s|96 85 65 98 92 85 96 75 99
Damian Lillard|PG|20s|90 93 55 85 85 45 97 72 92
Ja Morant|PG|20s|88 50 65 88 95 55 88 50 92
Shai Gilgeous-Alexander|PG|20s|97 80 85 85 98 55 95 88 96
Trae Young|PG|20s|87 85 45 95 80 35 92 85 95
Chris Paul|PG|20s|86 85 82 95 65 50 85 70 72
Russell Westbrook|PG|20s|82 50 72 88 85 82 70 85 85
Jalen Brunson|PG|20s|90 85 60 85 92 40 96 85 94
Tyrese Haliburton|PG|20s|88 90 60 97 72 45 92 72 80
Cade Cunningham|PG|20s|91 78 72 92 88 60 88 82 95
De'Aaron Fox|PG|20s|87 72 70 82 92 45 92 85 90
Tyrese Maxey|PG|20s|88 85 60 78 88 40 88 85 90
Jamal Murray|PG|20s|87 85 60 82 85 45 95 62 85
Ben Simmons|PG|20s|78 5 90 90 72 75 50 35 58
Kyle Lowry|PG|20s|80 85 80 85 60 50 85 70 60
Devin Booker|SG|20s|91 88 65 85 92 50 92 82 94
Donovan Mitchell|SG|20s|91 88 70 80 90 50 90 85 94
James Harden|SG|20s|87 88 62 95 80 60 80 80 85
Bradley Beal|SG|20s|85 85 55 75 88 50 82 50 90
Anthony Edwards|SG|20s|92 88 82 78 92 60 92 92 95
Klay Thompson|SG|20s|81 92 68 60 65 45 82 55 68
Jaylen Brown|SG|20s|90 78 82 72 90 65 88 85 86
Kyrie Irving|SG|20s|89 90 60 85 93 40 96 60 90
Payton Pritchard|SG|20s|79 88 60 75 65 45 85 92 65
Marcus Smart|SG|20s|80 72 95 78 60 50 82 70 55
Tyler Herro|SG|20s|84 88 50 75 82 50 85 72 85
Jordan Clarkson|SG|20s|79 80 45 65 80 40 76 80 82
Malcolm Brogdon|SG|20s|80 85 65 75 75 50 80 55 65
Lou Williams|SG|20s|74 78 35 72 75 30 82 75 75
Eric Gordon|SG|20s|76 85 55 55 72 30 78 60 62
LeBron James|SF|20s|94 82 75 95 92 82 90 72 94
Kevin Durant|SF|20s|94 95 72 82 94 75 95 62 92
Kawhi Leonard|SF|20s|92 88 90 75 88 70 92 40 85
Jayson Tatum|SF|20s|94 85 85 82 88 85 88 85 92
Jimmy Butler|SF|20s|89 50 88 82 88 65 96 62 82
Paul George|SF|20s|87 85 85 75 80 65 80 55 82
Carmelo Anthony|SF|20s|74 80 45 55 72 55 75 75 60
DeMar DeRozan|SF|20s|85 55 60 82 88 50 96 90 88
Jalen Williams|SF|20s|88 80 85 82 85 60 85 80 82
Jalen Johnson|SF|20s|86 70 78 82 85 82 78 80 80
Giannis Antetokounmpo|PF|20s|98 50 90 85 99 92 85 85 97
Anthony Davis|PF|20s|92 40 95 65 90 92 78 50 85
Pascal Siakam|PF|20s|87 70 82 78 86 75 80 85 82
Julius Randle|PF|20s|86 75 62 78 88 88 72 82 88
Draymond Green|PF|20s|84 55 95 88 55 75 80 70 45
Blake Griffin|PF|20s|72 70 60 72 65 65 65 45 55
Evan Mobley|PF|20s|88 55 96 75 85 85 75 85 70
Jaren Jackson Jr.|PF|20s|85 72 96 45 82 65 75 70 72
Naz Reid|PF|20s|79 82 65 55 75 70 75 85 65
Kevin Love|PF|20s|74 85 50 70 55 85 70 55 45
Nikola Jokic|C|20s|99 82 72 99 96 95 95 95 90
Joel Embiid|C|20s|95 82 85 72 97 88 88 45 96
Rudy Gobert|C|20s|86 5 98 40 72 95 55 90 35
Domantas Sabonis|C|20s|87 40 65 88 85 99 70 92 75
Karl-Anthony Towns|C|20s|88 88 60 72 88 88 78 75 85
Victor Wembanyama|C|20s|94 72 99 72 90 92 82 65 90
Dwight Howard|C|20s|74 5 80 35 65 85 50 75 35
Jalen Duren|C|20s|84 5 82 60 88 96 68 85 65
Chet Holmgren|C|20s|87 80 95 65 82 85 78 60 72
Montrezl Harrell|C|20s|76 10 55 50 82 68 68 85 65
Andre Drummond|C|20s|76 10 75 45 72 97 50 85 50
Al Horford|C|20s|79 82 82 75 62 72 82 80 45
`;

// Players eligible through sources other than All-NBA 1980–2026.
const OTHER_SOURCES = {
  'Hall of Fame / 75th Team': [
    'Bill Walton', 'Jamaal Wilkes', 'Bobby Jones', 'Elvin Hayes', 'Dan Issel', 'Artis Gilmore',
    'Jack Sikma', 'Bob Lanier', 'Calvin Murphy', 'David Thompson', 'Maurice Cheeks', 'Toni Kukoc',
    'Arvydas Sabonis', 'Vlade Divac', 'Sarunas Marciulionis', 'Michael Cooper', 'Jo Jo White',
    'Pete Maravich', 'Earl Monroe', 'Bob Dandridge', 'Rick Barry', 'Spencer Haywood',
    'George McGinnis', 'Bob McAdoo', 'Dave Cowens', 'Wes Unseld',
  ],
  'Sixth Man of the Year': [
    'Ricky Pierce', 'Roy Tarpley', 'Eddie Johnson', 'Clifford Robinson', 'Dell Curry', 'John Starks',
    'Danny Manning', 'Darrell Armstrong', 'Rodney Rogers', 'Aaron McKie', 'Corliss Williamson',
    'Bobby Jackson', 'Antawn Jamison', 'Ben Gordon', 'Mike Miller', 'Leandro Barbosa', 'Jason Terry',
    'Jamal Crawford', 'Lamar Odom', 'J.R. Smith', 'Lou Williams', 'Eric Gordon', 'Montrezl Harrell',
    'Jordan Clarkson', 'Tyler Herro', 'Malcolm Brogdon', 'Naz Reid', 'Payton Pritchard',
  ],
  'Defensive Player of the Year': ['Mark Eaton', 'Marcus Camby', 'Marcus Smart', 'Jaren Jackson Jr.'],
};

const ERAS = ['80s', '90s', '00s', '10s', '20s'];
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const KEYS = ['ovr', 'three', 'def', 'play', 'inside', 'rebounding', 'clutch', 'durability', 'usage'];

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (s) => fold(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const eraOfYear = (y) => (y >= 2020 ? '20s' : y >= 2010 ? '10s' : y >= 2000 ? '00s' : y >= 1990 ? '90s' : '80s');

const errors = [];
const cards = [];
const seen = new Set();

for (const [i, line] of RAW.split('\n').entries()) {
  if (!line.trim()) continue;
  const [name, pos, era, nums] = line.split('|');
  const vals = nums.trim().split(/\s+/).map(Number);
  if (!POSITIONS.includes(pos)) errors.push(`line ${i}: bad pos ${pos}`);
  if (!ERAS.includes(era)) errors.push(`line ${i}: bad era ${era}`);
  if (vals.length !== KEYS.length || vals.some((v) => !(v >= 1 && v <= 99))) errors.push(`line ${i}: bad ratings for ${name}`);
  const playerId = slug(name);
  const id = `${playerId}-${era}`;
  if (seen.has(id)) errors.push(`duplicate card ${id}`);
  seen.add(id);
  const card = { id, playerId, name, pos, era };
  KEYS.forEach((k, j) => (card[k] = vals[j]));
  cards.push(card);
}

// --- Eligibility ---
const allNba = parseAllNba();
const allNbaIds = new Set(allNba.map((s) => slug(s.name)));
const otherIds = new Map();
for (const [src, names] of Object.entries(OTHER_SOURCES)) for (const n of names) otherIds.set(slug(n), src);
for (const c of cards) {
  if (allNbaIds.has(c.playerId)) c.source = 'All-NBA';
  else if (otherIds.has(c.playerId)) c.source = otherIds.get(c.playerId);
  else errors.push(`not eligible (no source): ${c.name}`);
}

// --- All-NBA points per era card (1st=5, 2nd=3, 3rd=1) ---
const PTS = { 1: 5, 2: 3, 3: 1 };
const cardPts = new Map();
const missingCards = [];
for (const s of allNba) {
  const id = `${slug(s.name)}-${eraOfYear(s.year)}`;
  cardPts.set(id, (cardPts.get(id) ?? 0) + PTS[s.team]);
  if (!seen.has(id)) missingCards.push(`${s.name} ${eraOfYear(s.year)} (${s.year})`);
}
if (missingCards.length) errors.push(`All-NBA season with no era card: ${[...new Set(missingCards)].join(', ')}`);

// eras[]: every decade this player has a card for (v1 schema field)
const erasByPlayer = {};
for (const c of cards) (erasByPlayer[c.playerId] ??= []).push(c.era);
for (const c of cards) {
  c.eras = ERAS.filter((e) => erasByPlayer[c.playerId].includes(e));
  c.allNbaPts = cardPts.get(c.id) ?? 0;
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'data'), { recursive: true });
writeFileSync(
  join(root, 'data', 'players.json'),
  JSON.stringify({ version: 2, eras: ERAS, positions: POSITIONS, cards }, null, 1) + '\n'
);

// --- Report ---
const MIN = 5;
const players = Object.keys(erasByPlayer).length;
console.log(`players.json: ${cards.length} cards, ${players} players\n`);
console.log('era  | ' + POSITIONS.map((p) => p.padEnd(13)).join('') + 'total');
const thin = [];
for (const e of ERAS) {
  let row = `${e}  | `;
  let tot = 0;
  for (const p of POSITIONS) {
    const cell = cards.filter((c) => c.era === e && c.pos === p);
    tot += cell.length;
    const ovr = cell.map((c) => c.ovr);
    row += `${String(cell.length).padStart(2)} (${Math.min(...ovr)}-${Math.max(...ovr)})`.padEnd(13);
    if (cell.length < MIN) thin.push(`${e} ${p}`);
  }
  console.log(row + tot);
}
console.log('\n(count (OVR range))');
console.log(thin.length ? `THIN CELLS (<${MIN}): ${thin.join(', ')}` : `No cells under ${MIN}.`);

const bySrc = {};
for (const id of Object.keys(erasByPlayer)) {
  const src = cards.find((c) => c.playerId === id).source;
  bySrc[src] = (bySrc[src] ?? 0) + 1;
}
console.log('\nPlayers by eligibility source:', bySrc);

const tiers = { '95+': 0, '90-94': 0, '85-89': 0, '80-84': 0, '<80': 0 };
for (const c of cards) tiers[c.ovr >= 95 ? '95+' : c.ovr >= 90 ? '90-94' : c.ovr >= 85 ? '85-89' : c.ovr >= 80 ? '80-84' : '<80']++;
console.log('OVR tiers:', tiers);

// Cross-check: Spearman-ish sanity — big All-NBA decades should rate high.
const flags = cards.filter((c) => (c.allNbaPts >= 15 && c.ovr < 92) || (c.allNbaPts >= 8 && c.ovr < 87) || (c.allNbaPts === 0 && c.ovr >= 92));
console.log(flags.length ? '\nCHECK (All-NBA pts vs OVR):\n' + flags.map((c) => `  ${c.name} ${c.era}: ${c.allNbaPts} pts, OVR ${c.ovr}`).join('\n') : '\nAll-NBA cross-check: no outliers.');

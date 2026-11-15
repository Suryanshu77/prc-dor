// Curated image URLs for the football preference lists.
// Static on purpose: plain name -> image URL maps, no network round-trip and
// no paid APIs. Values were HEAD/GET-verified when written (all resolve with
// 2xx/3xx). Clubs and leagues are transparent PNG crests, nations are flag
// images, players are square face-cropped portraits. The combobox always
// allows a custom entry, so an unlisted favourite simply has no image and the
// caller falls back to an icon.

export const FOOTBALL_CLUB_IMAGES: Readonly<Record<string, string>> = {
  "Real Madrid": "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  "Manchester City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  "Manchester United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  Liverpool: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  Arsenal: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
  Chelsea: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
  "Tottenham Hotspur": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
  "Bayern Munich": "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  "Borussia Dortmund": "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  "Bayer Leverkusen": "https://a.espncdn.com/i/teamlogos/soccer/500/131.png",
  "RB Leipzig": "https://a.espncdn.com/i/teamlogos/soccer/500/11420.png",
  "Paris Saint-Germain": "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "Olympique Marseille": "https://a.espncdn.com/i/teamlogos/soccer/500/176.png",
  "Olympique Lyon": "https://a.espncdn.com/i/teamlogos/soccer/500/167.png",
  Juventus: "https://a.espncdn.com/i/teamlogos/soccer/500/111.png",
  "AC Milan": "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
  "Inter Milan": "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  "AS Roma": "https://a.espncdn.com/i/teamlogos/soccer/500/104.png",
  "SSC Napoli": "https://a.espncdn.com/i/teamlogos/soccer/500/114.png",
  Sevilla: "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
  Valencia: "https://a.espncdn.com/i/teamlogos/soccer/500/94.png",
  "Athletic Club": "https://a.espncdn.com/i/teamlogos/soccer/500/93.png",
  "Real Sociedad": "https://a.espncdn.com/i/teamlogos/soccer/500/89.png",
  Benfica: "https://a.espncdn.com/i/teamlogos/soccer/500/1929.png",
  "FC Porto": "https://a.espncdn.com/i/teamlogos/soccer/500/437.png",
  "Sporting CP": "https://a.espncdn.com/i/teamlogos/soccer/500/2250.png",
  Ajax: "https://a.espncdn.com/i/teamlogos/soccer/500/139.png",
  "PSV Eindhoven": "https://a.espncdn.com/i/teamlogos/soccer/500/148.png",
  Feyenoord: "https://a.espncdn.com/i/teamlogos/soccer/500/142.png",
  Celtic: "https://a.espncdn.com/i/teamlogos/soccer/500/256.png",
  Rangers: "https://a.espncdn.com/i/teamlogos/soccer/500/257.png",
  Galatasaray: "https://a.espncdn.com/i/teamlogos/soccer/500/432.png",
  Fenerbahce: "https://a.espncdn.com/i/teamlogos/soccer/500/436.png",
  "LA Galaxy": "https://a.espncdn.com/i/teamlogos/soccer/500/187.png",
  Flamengo: "https://a.espncdn.com/i/teamlogos/soccer/500/819.png",
  Palmeiras: "https://a.espncdn.com/i/teamlogos/soccer/500/2029.png",
  "River Plate": "https://a.espncdn.com/i/teamlogos/soccer/500/16.png",
  "Boca Juniors": "https://a.espncdn.com/i/teamlogos/soccer/500/5.png",
  "Al Ahly": "https://a.espncdn.com/i/teamlogos/soccer/500/10207.png",
  "FC Barcelona": "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  "Atletico Madrid": "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  "Al Hilal": "https://a.espncdn.com/i/teamlogos/soccer/500/929.png",
  "Al Nassr": "https://a.espncdn.com/i/teamlogos/soccer/500/817.png",
  "Al Ahli Jeddah": "https://a.espncdn.com/i/teamlogos/soccer/500/8346.png",
  "Inter Miami": "https://a.espncdn.com/i/teamlogos/soccer/500/20232.png",
};

export const FOOTBALL_NATION_IMAGES: Readonly<Record<string, string>> = {
  Argentina: "https://flagcdn.com/w80/ar.png",
  Brazil: "https://flagcdn.com/w80/br.png",
  France: "https://flagcdn.com/w80/fr.png",
  Germany: "https://flagcdn.com/w80/de.png",
  Spain: "https://flagcdn.com/w80/es.png",
  England: "https://flagcdn.com/w80/gb-eng.png",
  Italy: "https://flagcdn.com/w80/it.png",
  Netherlands: "https://flagcdn.com/w80/nl.png",
  Belgium: "https://flagcdn.com/w80/be.png",
  Croatia: "https://flagcdn.com/w80/hr.png",
  Uruguay: "https://flagcdn.com/w80/uy.png",
  Colombia: "https://flagcdn.com/w80/co.png",
  Chile: "https://flagcdn.com/w80/cl.png",
  Mexico: "https://flagcdn.com/w80/mx.png",
  "United States": "https://flagcdn.com/w80/us.png",
  Canada: "https://flagcdn.com/w80/ca.png",
  Japan: "https://flagcdn.com/w80/jp.png",
  "South Korea": "https://flagcdn.com/w80/kr.png",
  Australia: "https://flagcdn.com/w80/au.png",
  Morocco: "https://flagcdn.com/w80/ma.png",
  Senegal: "https://flagcdn.com/w80/sn.png",
  Nigeria: "https://flagcdn.com/w80/ng.png",
  Ghana: "https://flagcdn.com/w80/gh.png",
  Cameroon: "https://flagcdn.com/w80/cm.png",
  Egypt: "https://flagcdn.com/w80/eg.png",
  "Ivory Coast": "https://flagcdn.com/w80/ci.png",
  Algeria: "https://flagcdn.com/w80/dz.png",
  Tunisia: "https://flagcdn.com/w80/tn.png",
  Sweden: "https://flagcdn.com/w80/se.png",
  Denmark: "https://flagcdn.com/w80/dk.png",
  Norway: "https://flagcdn.com/w80/no.png",
  Poland: "https://flagcdn.com/w80/pl.png",
  Switzerland: "https://flagcdn.com/w80/ch.png",
  Austria: "https://flagcdn.com/w80/at.png",
  Ukraine: "https://flagcdn.com/w80/ua.png",
  Serbia: "https://flagcdn.com/w80/rs.png",
  Greece: "https://flagcdn.com/w80/gr.png",
  Turkey: "https://flagcdn.com/w80/tr.png",
  "Saudi Arabia": "https://flagcdn.com/w80/sa.png",
  Iran: "https://flagcdn.com/w80/ir.png",
  India: "https://flagcdn.com/w80/in.png",
  Portugal: "https://flagcdn.com/w80/pt.png",
};

export const FOOTBALL_PLAYER_IMAGES: Readonly<Record<string, string>> = {
  "Lionel Messi":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg/330px-Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg",
  "Cristiano Ronaldo":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Cristiano_Ronaldo_2018_%28cropped%29.jpg/330px-Cristiano_Ronaldo_2018_%28cropped%29.jpg",
  "Kylian Mbappe":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Kylian_Mbappe_France_v_Senegal_16_June_2026-391_%28cropped%29.jpg/330px-Kylian_Mbappe_France_v_Senegal_16_June_2026-391_%28cropped%29.jpg",
  "Erling Haaland":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Erling_Haaland_Morocco_v_Norway_7_June_2026-51.jpg/330px-Erling_Haaland_Morocco_v_Norway_7_June_2026-51.jpg",
  "Jude Bellingham":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Jude_Bellingham_England_v_Ghana_23_June_2026-061_%28cropped%29.jpg/330px-Jude_Bellingham_England_v_Ghana_23_June_2026-061_%28cropped%29.jpg",
  "Vinicius Junior":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Vin%C3%ADcius_J%C3%BAnior_Brazil_V_Morocco_13_June_2026-207_%28cropped%29.jpg/330px-Vin%C3%ADcius_J%C3%BAnior_Brazil_V_Morocco_13_June_2026-207_%28cropped%29.jpg",
  Rodri:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Rodri_Argentina_v_Spain_19_July_2026-187_%28cropped%29.jpg/330px-Rodri_Argentina_v_Spain_19_July_2026-187_%28cropped%29.jpg",
  "Luka Modric":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Luka_Modric_Croatia_v_Portugal_2_July_2026-055.jpg/330px-Luka_Modric_Croatia_v_Portugal_2_July_2026-055.jpg",
  "Toni Kroos":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Toni_Kroos_Real_Madrid_2021.jpg/330px-Toni_Kroos_Real_Madrid_2021.jpg",
  "Kevin De Bruyne":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Kevin_De_Bruyne_USMNT_v_Belgium_Mar_28_2026-64_%28cropped%29.jpg/330px-Kevin_De_Bruyne_USMNT_v_Belgium_Mar_28_2026-64_%28cropped%29.jpg",
  "Mohamed Salah":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Mohamed_Salah_Argentina_v_Egypt_7_July_2026-163_%28cropped%29.jpg/330px-Mohamed_Salah_Argentina_v_Egypt_7_July_2026-163_%28cropped%29.jpg",
  "Sadio Mane":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Sadio_Mane_France_v_Senegal_16_June_2026-450.jpg/330px-Sadio_Mane_France_v_Senegal_16_June_2026-450.jpg",
  "Robert Lewandowski":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Robert_Lewandowski_NYCFC_v_Chicago_25_July_2026-383.jpg/330px-Robert_Lewandowski_NYCFC_v_Chicago_25_July_2026-383.jpg",
  "Karim Benzema":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Karim_Benzema_vs._FC_Schalke_04_%2816647992937%29.jpg/330px-Karim_Benzema_vs._FC_Schalke_04_%2816647992937%29.jpg",
  Neymar:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg/330px-Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg",
  "Antoine Griezmann":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/FRA-ARG_%2810%29_%28cropped%29.jpg/330px-FRA-ARG_%2810%29_%28cropped%29.jpg",
  "Harry Kane":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Harry_Kane_England_v_Ghana_23_June_2026-024_%28cropped%29.jpg/330px-Harry_Kane_England_v_Ghana_23_June_2026-024_%28cropped%29.jpg",
  "Phil Foden":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/2023-10-04_Fu%C3%9Fball%2C_M%C3%A4nner%2C_UEFA_Champions_League%2C_RB_Leipzig_-_Manchester_City_FC_1DX_2613%2C_Phil_Foden.jpg/330px-2023-10-04_Fu%C3%9Fball%2C_M%C3%A4nner%2C_UEFA_Champions_League%2C_RB_Leipzig_-_Manchester_City_FC_1DX_2613%2C_Phil_Foden.jpg",
  "Bukayo Saka":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Bukayo_Saka_England_v_Ghana_23_June_2026-057_%28cropped%29.jpg/330px-Bukayo_Saka_England_v_Ghana_23_June_2026-057_%28cropped%29.jpg",
  "Declan Rice":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Declan_Rice_England_v_Ghana_23_June_2026-150.jpg/330px-Declan_Rice_England_v_Ghana_23_June_2026-150.jpg",
  "Virgil van Dijk":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/20160604_AUT_NED_8876_%28cropped%29.jpg/330px-20160604_AUT_NED_8876_%28cropped%29.jpg",
  "Alisson Becker":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Alisson_Becker_Brazil_V_Morocco_13_June_2026-117_%28cropped%29.jpg/330px-Alisson_Becker_Brazil_V_Morocco_13_June_2026-117_%28cropped%29.jpg",
  "Thibaut Courtois":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Thibaut_Courtois_Belgium_v_USA_6_July_2026-076_%28cropped%29.jpg/330px-Thibaut_Courtois_Belgium_v_USA_6_July_2026-076_%28cropped%29.jpg",
  "Manuel Neuer":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Manuel_Neuer_Ecuador_v_Germany_25_June_2026-148.jpg/330px-Manuel_Neuer_Ecuador_v_Germany_25_June_2026-148.jpg",
  "Gianluigi Buffon":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Norway_Italy_-_June_2025_A_44_%28Gianluigi_Buffon%29.jpg/330px-Norway_Italy_-_June_2025_A_44_%28Gianluigi_Buffon%29.jpg",
  "Iker Casillas":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Iker-Casillas-SportsTrade-2021-cropped.jpg/330px-Iker-Casillas-SportsTrade-2021-cropped.jpg",
  Ederson:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Ederson_Brazil_V_Morocco_13_June_2026-14_%28cropped%29.jpg/330px-Ederson_Brazil_V_Morocco_13_June_2026-14_%28cropped%29.jpg",
  "Marc-Andre ter Stegen":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Marc-Andre_Ter_Stegen_ACCI_FCBARCELONA_Turisme_Catalunya_gira_pretemporada_CATPRESS.jpg/330px-Marc-Andre_Ter_Stegen_ACCI_FCBARCELONA_Turisme_Catalunya_gira_pretemporada_CATPRESS.jpg",
  "Achraf Hakimi":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Achraf_Hakimi_Morocco_v_Norway_7_June_2026-32.jpg/330px-Achraf_Hakimi_Morocco_v_Norway_7_June_2026-32.jpg",
  "Theo Hernandez":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Theo_Hernandez_France_v_Senegal_16_June_2026-222_%28cropped%29.jpg/330px-Theo_Hernandez_France_v_Senegal_16_June_2026-222_%28cropped%29.jpg",
  Marquinhos:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Marquinhos_Brazil_V_Morocco_13_June_2026-153_%28cropped%29.jpg/330px-Marquinhos_Brazil_V_Morocco_13_June_2026-153_%28cropped%29.jpg",
  "Ruben Dias":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Ruben_Dias_Croatia_v_Portugal_2_July_2026-228_%28cropped%29.jpg/330px-Ruben_Dias_Croatia_v_Portugal_2_July_2026-228_%28cropped%29.jpg",
  "Antonio Rudiger":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Antonio_Rudiger_Ecuador_v_Germany_25_June_2026-002.jpg/330px-Antonio_Rudiger_Ecuador_v_Germany_25_June_2026-002.jpg",
  "Sergio Ramos":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Sergio_Ramos_Interview_2021_%28cropped%29.jpg/330px-Sergio_Ramos_Interview_2021_%28cropped%29.jpg",
  "Dani Carvajal":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/UEFA_EURO_qualifiers_Sweden_vs_Spain_20191015_Dani_Carvajal_10_%28cropped%29.jpg/330px-UEFA_EURO_qualifiers_Sweden_vs_Spain_20191015_Dani_Carvajal_10_%28cropped%29.jpg",
  "Trent Alexander-Arnold":
    "https://upload.wikimedia.org/wikipedia/commons/5/5d/Trent_Alexander-Arnold_2018_%28cropped%29.jpg",
  "Andrew Robertson":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Andy_Robertson_Scotland_v_Bolivia_6_June_2026-43.jpg/330px-Andy_Robertson_Scotland_v_Bolivia_6_June_2026-43.jpg",
  "Joshua Kimmich":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Joshua_Kimmich_Ecuador_v_Germany_25_June_2026-149.jpg/330px-Joshua_Kimmich_Ecuador_v_Germany_25_June_2026-149.jpg",
  "Federico Valverde":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Federico_Valverde_2021_%28cropped%29.jpg/330px-Federico_Valverde_2021_%28cropped%29.jpg",
  Pedri:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Pedri_France_v_Spain_7.24.26-245.jpg/330px-Pedri_France_v_Spain_7.24.26-245.jpg",
  Gavi: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Gavi_Argentina_v_Spain_19_July_2026-013.jpg/330px-Gavi_Argentina_v_Spain_19_July_2026-013.jpg",
  "Lamine Yamal":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Lamine_Yamal_France_v_Spain_7.24.26-142.jpg/330px-Lamine_Yamal_France_v_Spain_7.24.26-142.jpg",
  "Rafael Leao":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Rafael_Leao_Croatia_v_Portugal_2_July_2026-187_%28cropped%29.jpg/330px-Rafael_Leao_Croatia_v_Portugal_2_July_2026-187_%28cropped%29.jpg",
  "Bruno Fernandes":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Bruno_Fernandes_USMNT_v_Portugal_Mar_31_2026-27_%28cropped%29.jpg/330px-Bruno_Fernandes_USMNT_v_Portugal_Mar_31_2026-27_%28cropped%29.jpg",
  "Bernardo Silva":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Bernardo_Silva_Croatia_v_Portugal_2_July_2026-238.jpg/330px-Bernardo_Silva_Croatia_v_Portugal_2_July_2026-238.jpg",
  "Riyad Mahrez":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Mahrez_2021.jpg/330px-Mahrez_2021.jpg",
  "Sergio Aguero":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Ag%C3%BCero_in_2018.jpg/330px-Ag%C3%BCero_in_2018.jpg",
  "Diego Maradona":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Argentina_celebrando_copa_%28cropped%29.jpg/330px-Argentina_celebrando_copa_%28cropped%29.jpg",
  Pele: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Pele_con_brasil_%28cropped%29.jpg/330px-Pele_con_brasil_%28cropped%29.jpg",
  "Johan Cruyff":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Johan_Cruijff_%281974%29.jpg/330px-Johan_Cruijff_%281974%29.jpg",
  "Zinedine Zidane":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Zinedine_Zidane_by_Tasnim_03.jpg/330px-Zinedine_Zidane_by_Tasnim_03.jpg",
  Ronaldinho:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Ronaldinho_in_2019.jpg/330px-Ronaldinho_in_2019.jpg",
  "Ronaldo Nazario":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/12.12.2025_%E2%80%93_Cerim%C3%B4nia_de_lan%C3%A7amento_do_SBT_News_-_54980664160_%28cropped2%29.jpg/330px-12.12.2025_%E2%80%93_Cerim%C3%B4nia_de_lan%C3%A7amento_do_SBT_News_-_54980664160_%28cropped2%29.jpg",
  "Thierry Henry":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Thierry_Henry_%2851649035951%29_%28cropped%29.jpg/330px-Thierry_Henry_%2851649035951%29_%28cropped%29.jpg",
  "Andres Iniesta":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Andr%C3%A9s_Iniesta_Argentina_v_Spain_19_July_2026-034_%28cropped%29.jpg/330px-Andr%C3%A9s_Iniesta_Argentina_v_Spain_19_July_2026-034_%28cropped%29.jpg",
  "Paolo Maldini":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Paolo_Maldini_AC_Milan_Technical_director_2018.jpg/330px-Paolo_Maldini_AC_Milan_Technical_director_2018.jpg",
  "Franz Beckenbauer":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Franz_Beckenbauer_%281975%29.jpg/330px-Franz_Beckenbauer_%281975%29.jpg",
  "Bobby Charlton":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/LondonHouseAmsterdam1966_Bobby_Charlton.jpg/330px-LondonHouseAmsterdam1966_Bobby_Charlton.jpg",
  "George Best":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/George_best_1976.jpg/330px-George_best_1976.jpg",
  Eusebio:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Eusebio_en_1973.jpg/330px-Eusebio_en_1973.jpg",
  Garrincha:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Manoel_Francisco_dos_Santos-Garrincha.jpg/330px-Manoel_Francisco_dos_Santos-Garrincha.jpg",
  Romario:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Senadores_da_57%C2%AA_Legislatura_%2852689451805%29_%28cropped_-_3x4%29.jpg/330px-Senadores_da_57%C2%AA_Legislatura_%2852689451805%29_%28cropped_-_3x4%29.jpg",
  "Gabriel Batistuta":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Omar_Batistuta_%282%29.jpg/330px-Omar_Batistuta_%282%29.jpg",
  "Alan Shearer":
    "https://upload.wikimedia.org/wikipedia/commons/b/ba/Alan_Shearer_2008.jpg",
  "Michael Owen":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Michael_Owen.jpg/330px-Michael_Owen.jpg",
  "Wayne Rooney":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Wayne_Rooney_%2850121495731%29_%28cropped%29.jpg/330px-Wayne_Rooney_%2850121495731%29_%28cropped%29.jpg",
  "Didier Drogba":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Didier_Drogba_%282019%29_%28cropped2%29.jpg/330px-Didier_Drogba_%282019%29_%28cropped2%29.jpg",
  "Samuel Eto'o":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Sammuel_Eto%27o_Fils_02.jpg/330px-Sammuel_Eto%27o_Fils_02.jpg",
  "Yaya Toure":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Yaya_Tour%C3%A9_%28cropped%29.jpg/330px-Yaya_Tour%C3%A9_%28cropped%29.jpg",
  "George Weah":
    "https://upload.wikimedia.org/wikipedia/commons/5/53/Clar_Weah%2C_George_Weah%2C_Joe_Biden%2C_Jill_Biden_%28cropped%29.jpg",
  "Roger Milla":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Milla2008cropped.jpg/330px-Milla2008cropped.jpg",
  "Asamoah Gyan":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Asamoah_Gyan_%282014%29.jpg/330px-Asamoah_Gyan_%282014%29.jpg",
  "Mohamed Aboutrika":
    "https://upload.wikimedia.org/wikipedia/commons/f/f4/Aboutrika2011.jpg",
  "Mohamed Kudus":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Mohammed_Kudus_of_West_Ham_United.jpeg/330px-Mohammed_Kudus_of_West_Ham_United.jpeg",
  "Luis Suarez":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Luis_Su%C3%A1rez_2026_%28cropped%29.jpg/330px-Luis_Su%C3%A1rez_2026_%28cropped%29.jpg",
  Xavi: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Xavi%2C_Persepolis_vs._Al_Sadd%2C_20190520_02_%28cropped%29.jpg/330px-Xavi%2C_Persepolis_vs._Al_Sadd%2C_20190520_02_%28cropped%29.jpg",
};

export const FOOTBALL_LEAGUE_IMAGES: Readonly<Record<string, string>> = {
  "Premier League": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "La Liga": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  Bundesliga: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "Serie A": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  "Ligue 1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  Eredivisie: "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png",
  "Primeira Liga": "https://a.espncdn.com/i/leaguelogos/soccer/500/14.png",
  "Scottish Premiership":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/45.png",
  "Turkish Super Lig": "https://a.espncdn.com/i/leaguelogos/soccer/500/18.png",
  "Saudi Pro League": "https://a.espncdn.com/i/leaguelogos/soccer/500/2488.png",
  MLS: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png",
  Brasileirao: "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png",
  "Argentine Primera Division":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/1.png",
  "UEFA Champions League":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  "UEFA Europa League":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
  "FIFA World Cup": "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png",
  "UEFA European Championship":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/74.png",
  "Copa America": "https://a.espncdn.com/i/leaguelogos/soccer/500/83.png",
  "Africa Cup of Nations":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/76.png",
  "Asian Cup": "https://a.espncdn.com/i/leaguelogos/soccer/500/2243.png",
  "English Championship":
    "https://a.espncdn.com/i/leaguelogos/soccer/500/24.png",
  "Egyptian Premier League":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/ORA_League.png/330px-ORA_League.png",
};

export type FootballImageKind = "club" | "nation" | "player" | "league";

const IMAGE_MAPS: Readonly<
  Record<FootballImageKind, Readonly<Record<string, string>>>
> = {
  club: FOOTBALL_CLUB_IMAGES,
  nation: FOOTBALL_NATION_IMAGES,
  player: FOOTBALL_PLAYER_IMAGES,
  league: FOOTBALL_LEAGUE_IMAGES,
};

// Best-effort lookup: exact match first, then case-insensitive, so a value
// stored with different casing still resolves. Returns undefined for custom
// entries so the UI can fall back to an icon.
export function footballImage(
  kind: FootballImageKind,
  name: string | null | undefined,
): string | undefined {
  if (!name) return undefined;
  const map = IMAGE_MAPS[kind];
  const exact = map[name];
  if (exact) return exact;
  const lowered = name.trim().toLowerCase();
  for (const [key, url] of Object.entries(map)) {
    if (key.trim().toLowerCase() === lowered) return url;
  }
  return undefined;
}

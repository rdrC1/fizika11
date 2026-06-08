const planetsData = [
  {
    id: "sun",
    name: "Nap",
    color: "#ffaa00",
    glowColor: "rgba(255, 170, 0, 0.4)",
    radius: 25,
    realRadius: 1392700,
    distance: 0,
    realDistance: 0,
    speed: 0,
    moonsCount: 0,
    type: "Csillag",
    details: {
      summary: "A Naprendszer központi csillaga, egy sárga törpe. A teljes rendszer tömegének 99,86%-át teszi ki. Plazmából áll, és a magjában zajló magfúzió révén hatalmas mennyiségű energiát termel, amely fény és hő formájában sugárzik az űrbe, biztosítva a földi élet feltételeit.",
      facts: [
        "A Nap fényének körülbelül 8 perc és 20 másodpercre van szüksége, hogy elérje a Földet.",
        "A Nap magjában a hőmérséklet eléri a 15 millió Celsius-fokot, míg a felszínén 'csak' 5500 Celsius-fok uralkodik.",
        "Másodpercenként körülbelül 600 millió tonna hidrogént alakít héliummá nukleáris fúzióval.",
        "A Nap mágneses mezeje 11 éves cikluson megy keresztül, ami napfoltok és napkitörések képződésével jár."
      ],
      stats: {
        "Típus": "G2V osztályú sárga törpe csillag",
        "Egyenlítői átmérő": "1 392 700 km (109x Föld)",
        "Tömeg": "1,989 × 10³⁰ kg (333 000x Föld)",
        "Felszíni hőmérséklet": "~5 500 °C",
        "Maghőmérséklet": "~15 000 000 °C",
        "Forgási idő (egyenlítőnél)": "25,4 földi nap",
        "Kor": "~4,6 milliárd év"
      }
    }
  },
  {
    id: "mercury",
    name: "Merkúr",
    color: "#9e9e9e",
    glowColor: "rgba(158, 158, 158, 0.3)",
    radius: 6,
    realRadius: 4879,
    distance: 50,
    realDistance: 57.9,
    speed: 0.04,
    moonsCount: 0,
    type: "Kőzetbolygó",
    details: {
      summary: "A legkisebb és a Naphoz legközelebb keringő bolygó a Naprendszerben. Mivel nem rendelkezik érdemi légkörrel, amely megtartaná a hőt, a felszíni hőmérséklet drasztikusan ingadozik a nappali perzselő forróság és az éjszakai fagy között. Felszíne erősen kráteres, nagyon hasonlít a Holdunkra.",
      facts: [
        "A Merkúron egy év mindössze 88 földi napig tart, de egyetlen tengely körüli elfordulása 59 földi napot vesz igénybe.",
        "A második legsűrűbb bolygó a Naprendszerben; hatalmas vasmaggal rendelkezik, amely a bolygó térfogatának kb. 60%-át adja.",
        "Annak ellenére, hogy a legközelebb van a Naphoz, a Vénusz forróbb nála az üvegházhatás miatt.",
        "A Merkúr felszínén a gravitáció mindössze 38%-a a földinek."
      ],
      stats: {
        "Átmérő": "4 879 km (0,38x Föld)",
        "Tömeg": "3,301 × 10²³ kg (0,055x Föld)",
        "Közepes távolság a Naptól": "57,9 millió km (0,39 CSE)",
        "Keringési idő": "88 nap",
        "Tengelyforgási idő": "58,6 nap",
        "Felszíni hőmérséklet": "-180 °C-tól +430 °C-ig",
        "Holdak száma": "0"
      }
    }
  },
  {
    id: "venus",
    name: "Vénusz",
    color: "#e3bb76",
    glowColor: "rgba(227, 187, 118, 0.3)",
    radius: 9,
    realRadius: 12104,
    distance: 80,
    realDistance: 108.2,
    speed: 0.015,
    moonsCount: 0,
    type: "Kőzetbolygó",
    details: {
      summary: "Méretében és felépítésében a Föld 'ikertestvére', azonban a légköre pokoli körülményeket rejt. Rendkívül sűrű, főként szén-dioxidból álló légköre és kénsavfelhői brutális, elszabadult üvegházhatást okoznak, így ez a Naprendszer legforróbb bolygója.",
      facts: [
        "A Vénusz a tengelye körül az óramutató járásával megegyező irányban forog (retrográd forgás), ellentétben szinte az összes többi bolygóval.",
        "A felszínén a légnyomás 92-szerese a földinek – ez megegyezik a földi óceánok 900 méteres mélységében mérhető nyomással.",
        "A Vénuszon egy nap (tengely körüli forgás) hosszabb ideig tart (243 földi nap), mint egy teljes vénuszi év (225 földi nap).",
        "Az éjszakai égbolt legfényesebb csillagszerű égiteste, a népi kultúra Esthajnalcsillagként ismeri."
      ],
      stats: {
        "Átmérő": "12 104 km (0,95x Föld)",
        "Tömeg": "4,867 × 10²⁴ kg (0,815x Föld)",
        "Közepes távolság a Naptól": "108,2 millió km (0,72 CSE)",
        "Keringési idő": "224,7 nap",
        "Tengelyforgási idő": "243 nap (retrográd)",
        "Átlagos hőmérséklet": "+462 °C",
        "Holdak száma": "0"
      }
    }
  },
  {
    id: "earth",
    name: "Föld",
    color: "#4ba3e3",
    glowColor: "rgba(75, 163, 227, 0.35)",
    radius: 10,
    realRadius: 12742,
    distance: 120,
    realDistance: 149.6,
    speed: 0.01,
    moonsCount: 1,
    type: "Kőzetbolygó",
    details: {
      summary: "Az otthonunk, és jelenleg az egyetlen ismert égitest a világegyetemben, amelyen kialakult az élet. Felszínének kb. 71%-át folyékony víz borítja (világóceán). Kedvező elhelyezkedése a Nap lakhatósági zónájában, aktív mágneses mezeje és a nitrogén-oxigén alapú légkör teszi lehetővé a komplex bioszféra fennmaradását.",
      facts: [
        "A Föld az egyetlen bolygó a Naprendszerben, amelyet nem római vagy görög istenségről neveztek el.",
        "A Föld mágneses mezeje (magnetoszféra) megvéd minket a napszél káros, töltött részecskéitől.",
        "A Föld nem tökéletes gömb, hanem a forgás miatti centrifugális erő következtében az egyenlítőnél kissé kidudorodik (geoid).",
        "A bolygó légköre nagyrészt nitrogénből (78%) és oxigénből (21%) áll, ami kulcsfontosságú az élethez."
      ],
      stats: {
        "Átmérő": "12 742 km",
        "Tömeg": "5,972 × 10²⁴ kg",
        "Közepes távolság a Naptól": "149,6 millió km (1,0 CSE)",
        "Keringési idő": "365,25 nap",
        "Tengelyforgási idő": "24 óra",
        "Átlagos hőmérséklet": "+15 °C",
        "Holdak száma": "1 (Hold)"
      }
    }
  },
  {
    id: "mars",
    name: "Mars",
    color: "#c25138",
    glowColor: "rgba(194, 81, 56, 0.3)",
    radius: 8,
    realRadius: 6779,
    distance: 160,
    realDistance: 227.9,
    speed: 0.008,
    moonsCount: 2,
    type: "Kőzetbolygó",
    details: {
      summary: "A 'Vörös Bolygóként' is emlegetett égitest a felszínét borító vas-oxid (rozsda) miatt kapta jellegzetes színét. Ritka, főként szén-dioxidból álló légköre van. Felszínén hatalmas kialudt vulkánok, mély kanyonok és pólusain fagyott vízből és szén-dioxidból álló jégsapkák találhatóak.",
      facts: [
        "A Marson található az Olympus Mons, a Naprendszer legnagyobb ismert vulkánja, amely háromszor magasabb a Mount Everestnél (22 km magas).",
        "Két apró, krumpli alakú holdja van, a Phobos és a Deimos, melyek valószínűleg befogott aszteroidák.",
        "Folyékony víz jelenleg nem maradhat meg stabilan a felszínén az alacsony légnyomás miatt, de a múltban kiterjedt folyók és tavak szabdalhatták.",
        "Számos marsjáró és űrszonda vizsgálja folyamatosan a bolygót az egykori mikrobiális élet nyomai után kutatva."
      ],
      stats: {
        "Átmérő": "6 779 km (0,53x Föld)",
        "Tömeg": "6,390 × 10²³ kg (0,107x Föld)",
        "Közepes távolság a Naptól": "227,9 millió km (1,52 CSE)",
        "Keringési idő": "687 nap",
        "Tengelyforgási idő": "24,6 óra",
        "Átlagos hőmérséklet": "-63 °C",
        "Holdak száma": "2"
      }
    }
  },
  {
    id: "jupiter",
    name: "Jupiter",
    color: "#d4a373",
    glowColor: "rgba(212, 163, 115, 0.3)",
    radius: 18,
    realRadius: 139820,
    distance: 220,
    realDistance: 778.5,
    speed: 0.003,
    moonsCount: 95,
    type: "Gázóriás",
    details: {
      summary: "A Naprendszer legnagyobb bolygója, egy hatalmas gázóriás, amely főleg hidrogénből és héliumból épül fel. Nincs szilárd felszíne. Brutális gravitációs mezeje védőpajzsként működik a belső kőzetbolygók számára, mivel magához vonzza vagy eltéríti az üstökösöket. Legismertebb jellegzetessége a Nagy Vörös Folt nevű óriásvihar.",
      facts: [
        "A Jupiter tömege két és félszerese az összes többi bolygó együttes tömegének.",
        "A Nagy Vörös Folt egy olyan anticiklonális vihar, amely legalább 350 éve tombol, és akkora, hogy a Föld kényelmesen elférne benne.",
        "Erős mágneses mezeje van, és több mint 90 hold kering körülötte, köztük a Galilei-holdak: Io, Europa, Ganymedes és Callisto.",
        "A Jupiter forog a leggyorsabban a saját tengelye körül a bolygók közül: egy nap ott mindössze 10 óráig tart."
      ],
      stats: {
        "Átmérő": "139 820 km (11x Föld)",
        "Tömeg": "1,898 × 10²⁷ kg (318x Föld)",
        "Közepes távolság a Naptól": "778,5 millió km (5,2 CSE)",
        "Keringési idő": "11,86 év",
        "Tengelyforgási idő": "9,9 óra",
        "Átlagos hőmérséklet": "-108 °C",
        "Holdak száma": "95"
      }
    }
  },
  {
    id: "saturn",
    name: "Szaturnusz",
    color: "#ead2ac",
    glowColor: "rgba(234, 210, 172, 0.3)",
    radius: 15,
    realRadius: 116460,
    distance: 280,
    realDistance: 1433.5,
    speed: 0.002,
    moonsCount: 146,
    hasRings: true,
    type: "Gázóriás",
    details: {
      summary: "A második legnagyobb bolygó, egy látványos gyűrűrendszerrel rendelkező gázóriás. A gyűrűk jégdarabokból, porszemekből és sziklákból állnak, amelyek a mikroszkopikustól a ház méretűig terjednek. A Szaturnusz sűrűsége a legkisebb a bolygók között; alacsonyabb, mint a vízé, így elméletileg lebegne egy óriási kádban.",
      facts: [
        "Bár a többi gázóriásnak is vannak gyűrűi, a Szaturnuszé a legfényesebb, legkiterjedtebb és legkomplexebb rendszer.",
        "Legnagyobb holdja, a Titán az egyetlen olyan hold a Naprendszerben, amelynek vastag légköre (főleg nitrogén) és folyékony metánból/etánból álló tavai vannak.",
        "A Szaturnusz rendelkezik a legtöbb holddal a Naprendszerben, jelenleg 146 ismertet tartanak számon.",
        "A szelek a Szaturnuszon elérhetik a hihetetlen 1800 km/órás sebességet is."
      ],
      stats: {
        "Átmérő": "116 460 km (9,4x Föld)",
        "Tömeg": "5,683 × 10²⁶ kg (95x Föld)",
        "Közepes távolság a Naptól": "1,43 milliárd km (9,58 CSE)",
        "Keringési idő": "29,45 év",
        "Tengelyforgási idő": "10,7 óra",
        "Átlagos hőmérséklet": "-139 °C",
        "Holdak száma": "146"
      }
    }
  },
  {
    id: "uranus",
    name: "Uránusz",
    color: "#aae0ec",
    glowColor: "rgba(170, 224, 236, 0.3)",
    radius: 12,
    realRadius: 50724,
    distance: 330,
    realDistance: 2872.5,
    speed: 0.0009,
    moonsCount: 28,
    type: "Jégóriás",
    details: {
      summary: "Egy jégóriás, amelynek légkörében lévő metángáz gyönyörű kékeszöld színt kölcsönöz. Legfőbb sajátossága, hogy a forgástengelye szinte teljesen a pályasíkjában fekszik (98 fokos dőlésszög), vagyis a bolygó gyakorlatilag 'az oldalán gördül' a Nap körül, ami extrém, évtizedekig tartó évszakokat okoz.",
      facts: [
        "Az Uránusz volt az első bolygó, amelyet távcső segítségével fedeztek fel a modern korban (William Herschel fedezte fel 1781-ben).",
        "Bár nem ez a legtávolabbi bolygó, mégis ez a leghidegebb a Naprendszerben; a hőmérséklet elérheti a -224 °C-ot is.",
        "Gyűrűrendszere nagyon sötét anyagból áll és függőlegesen áll a keringési síkhoz képest.",
        "A bolygó belsejét nagyrészt víz-, ammónia- és metánjég alkotja egy sziklás mag körül."
      ],
      stats: {
        "Átmérő": "50 724 km (4x Föld)",
        "Tömeg": "8,681 × 10²⁵ kg (14,5x Föld)",
        "Közepes távolság a Naptól": "2,87 milliárd km (19,19 CSE)",
        "Keringési idő": "84 év",
        "Tengelyforgási idő": "17,2 óra (retrográd)",
        "Átlagos hőmérséklet": "-197 °C",
        "Holdak száma": "28"
      }
    }
  },
  {
    id: "neptune",
    name: "Neptunusz",
    color: "#3f5efb",
    glowColor: "rgba(63, 94, 251, 0.35)",
    radius: 12,
    realRadius: 49244,
    distance: 380,
    realDistance: 4495.1,
    speed: 0.0006,
    moonsCount: 16,
    type: "Jégóriás",
    details: {
      summary: "A Naptól legmesszebb keringő, csodálatos mélykék színű jégóriás. A Naprendszer leghevesebb szelei itt fújnak, elérve a hangsebességnél is nagyobb sebességet. Távolsága miatt szabad szemmel láthatatlan; ez az egyetlen bolygó, amelyet először matematikai számításokkal jósoltak meg, és csak azután fedeztek fel távcsővel.",
      facts: [
        "A szélsebesség a Neptunuszon elérheti a 2100 km/órát, ami több mint ötszöröse a Földön valaha mért leggyorsabb tornádónak.",
        "Legnagyobb holdja, a Triton az egyetlen nagy hold retrográd keringéssel (a bolygó forgásával ellentétes irányban kering), és aktív jégvulkánok találhatók rajta.",
        "A Neptunusz 2011-ben fejezett be egy teljes keringést a Nap körül az 1846-os felfedezése óta.",
        "Mint a többi óriásbolygónak, neki is van egy halvány gyűrűrendszere, amelynek porcsomói íveket alkotnak."
      ],
      stats: {
        "Átmérő": "49 244 km (3,9x Föld)",
        "Tömeg": "1,024 × 10²⁶ kg (17x Föld)",
        "Közepes távolság a Naptól": "4,50 milliárd km (30,07 CSE)",
        "Keringési idő": "164,8 év",
        "Tengelyforgási idő": "16 óra",
        "Átlagos hőmérséklet": "-201 °C",
        "Holdak száma": "16"
      }
    }
  },
  {
    id: "pluto",
    name: "Plútó",
    color: "#a1887f",
    glowColor: "rgba(161, 136, 127, 0.3)",
    radius: 5,
    realRadius: 2376,
    distance: 420,
    realDistance: 5906.4,
    speed: 0.0004,
    moonsCount: 5,
    type: "Törpebolygó",
    details: {
      summary: "Sokáig a Naprendszer kilencedik bolygójaként tartották számon, ám 2006-ban a Nemzetközi Csillagászati Unió (IAU) törpebolygóvá minősítette át. Főleg kőzetből és jégből álló fagyott világ. A New Horizons űrszonda 2015-ös elrepülése során feltárta, hogy a Plútó meglepően aktív égitest, hatalmas szív alakú síksággal a felszínén.",
      facts: [
        "A Plútó kisebb, mint a Föld Holdja, de még a Jupiter, a Szaturnusz, az Uránusz és a Neptunusz néhány holdjánál is apróbb.",
        "Keringési pályája nagyon elnyúlt és ferde; keringési ideje alatt 20 évig közelebb van a Naphoz, mint a Neptunusz.",
        "Legnagyobb holdja, a Charon olyan hatalmas a Plútóhoz képest, hogy valójában egymás körül keringenek, így egy kettős törpebolygó-rendszert alkotnak.",
        "A felszínén látható híres, világos színű szív alakú területet (Tombaugh Regio) fagyott nitrogén és szén-dioxid jég borítja."
      ],
      stats: {
        "Átmérő": "2 376 km (0,18x Föld)",
        "Tömeg": "1,303 × 10²² kg (0,002x Föld)",
        "Közepes távolság a Naptól": "5,91 milliárd km (39,48 CSE)",
        "Keringési idő": "248 év",
        "Tengelyforgási idő": "6,4 nap (retrográd)",
        "Átlagos hőmérséklet": "-225 °C",
        "Holdak száma": "5"
      }
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = planetsData;
}

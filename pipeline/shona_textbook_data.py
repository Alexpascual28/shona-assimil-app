"""Comprehensive Idiomatic Translations, Sentence Splits, and Beginner Lexicon for Shona With Ease."""

from __future__ import annotations

import re

# Complete, natural, idiomatic English translations for all short/medium clips
# in nigeLbasa/inzwi-shona-sample and manassehzw/sna-manasseh-150-raw
IDIOMATIC_SENTENCE_TRANSLATIONS: dict[str, str] = {
    # nigeLbasa/inzwi-shona-sample
    "huyai kuno nekukasira!": "Come here quickly!",
    "makorokoto nekubudirira kwenyu!": "Congratulations on your success!",
    "makorokoto, wabudirira!": "Congratulations, you have succeeded!",
    "takatenga hupfu, shuga, mafuta, nemuriwo.": "We bought maize meal, sugar, cooking oil, and vegetables.",
    'vakuru vanoti, "chara chimwe hachitswanyi inda."': 'The elders say, "One finger cannot crush a louse."',
    "nekuda kwekushanda nesimba, akawana mubayiro.": "Because of working hard, he received a reward.",
    "unofunga kuti mvura ichanaya here mangwana?": "Do you think it will rain tomorrow?",
    'akadanidzira achiti, "batai mbavha iyo!"': 'He shouted, "Catch that thief!"',
    "baba vakaenda kuharare, asi vachadzoka mangwana.": "Father went to Harare, but he will return tomorrow.",
    "ndeipi mota yaunoda kutenga, tsvuku kana nhema?": "Which car do you want to buy, the red one or the black one?",
    'amai vakati, "chiuya kuno undibatsire."': 'Mother said, "Come here now and help me."',
    "gore rino kuchange kuine gohwo rakanaka, handiti?": "This year there will be a good harvest, won't there?",
    "kunyangwe zvainetsa, akakwanisa kupedza chikoro.": "Even though it was difficult, she managed to finish school.",
    "mhepo yakavhuvhuta nesimba, miti ikazununguka.": "The wind blew strongly, and the trees swayed.",
    "mbuya vangu, avo vanogara kumusha, vanorima nzungu.": "My grandmother, who lives at the rural home, grows groundnuts.",
    "mudzidzisi akati tiunze mabhuku edu mangwana.": "The teacher told us to bring our books tomorrow.",
    "mvura yanaya nhasi, saka tinofanira kunonoka kuenda kumunda.": "It has rained today, so we should delay going to the field.",

    # manassehzw/sna-manasseh-150-raw (Greetings, Courtesies & Imperatives)
    "mangwanani. ndamuka zvakanaka nhasi; ndirikugadzirira kuenda kusvondo.": "Good morning. I woke up well today; I am getting ready to go to church.",
    "mhoro shamwari yangu. wakafamba sei nezuro; wakasvika zvakanaka here?": "Hello my friend. How was your trip yesterday; did you arrive safely?",
    "waswera sei; ndanga ndichifona kuti ndibvunze kuti tinogona kusangana here nhasi.": "How has your day been? I was calling to ask if we can meet today.",
    "manheru amai. nhasi ndakaneta asi zvinhu zvafamba zvakanaka hazvo.": "Good evening, Mother. Today I am tired, but things went well nonetheless.",
    "makadini mose muri mumba ndinovimba makasimba.": "How are you all in the house? I hope you are doing well.",
    "ndikumbirewo kuti uvhura hwindo mhepo imbopinda mumba muno.": "May I please ask you to open the window so some fresh air can come into the room.",
    "vhara musuwo zvinyoronyoro nokuti mwana achiri akarara.": "Close the door gently because the baby is still asleep.",
    "vhara musuwo zvakasimba kana uchibuda mumba.": "Close the door firmly when you leave the house.",
    "uyai kuno mundibatsire kusimudza zvinhu zvinorema izvi.": "Come here and help me lift these heavy things.",
    "tora kapu iyi uiise pedyo nefafitera usati wabuda.": "Take this cup and put it near the window before you go out.",
    "tora bhuku riri patafura undipe ndimboverenga.": "Take the book on the table and give it to me so I can read for a bit.",
    "chigara pano womirira kusvika ndadzoka kubva kuchechi.": "Sit right here and wait until I return from church.",
    "svika kumba nenguva nhasi tisati tadya manheru.": "Arrive home on time today before we eat dinner.",
    "dzoka kumusha nekukurumidza kana wapedza basa.": "Return home quickly when you finish work.",
    "ugosvika pano manhero kuti tigozodya tese.": "Be sure to arrive here in the evening so that we can eat together.",
    "ndapota huyai muchinyararire nokuti murwere achangobatwa nehope.": "Please come in quietly because the patient has just fallen asleep.",
    "ndapota tumira mashoko acho zvakare nokuti handina kuaverenga zvakanaka.": "Please send the message again because I did not read it properly.",
    "mungandibatsirawo here kusimudza bhokisi ririkurema iri?": "Could you please help me lift this heavy box?",
    "ndinokumbirawo undibatsire basa iri, riri kundinetsa zvikuru.": "Please help me with this work; it is giving me a lot of trouble.",
    "pane tsvimbo yadonha pasi saka ndinokumbira uyinhonge.": "There is a walking stick that fell on the ground, so I ask that you pick it up.",

    # manassehzw/sna-manasseh-150-raw (Food, Household, Numbers, Time & Present Tense)
    "nyama iyi yakaoma chaizvo pakubikwa kwayo.": "This meat became very tough when it was cooked.",
    "ndinoda kudya sadza neusavi hwakanaka nhasi.": "I want to eat sadza with delicious relish today.",
    "nhasi ndichabika sadza nemuriwo kuti tidye tese kumba.": "Today I will cook sadza and vegetables so that we can eat together at home.",
    "ndinoda mvura inodziya nokuti kunze kuri kutonhora mangwanani ano.": "I want warm water because it is cold outside this morning.",
    "chingwa chapera saka ndichapfuura nekuchitoro pandinobva kubasa.": "The bread has run out, so I will pass by the store when I leave work.",
    "ndaisa mvura patafura; ndangomirira vamwe kuti vauye.": "I have put water on the table; I am just waiting for the others to come.",
    "ko ukawedzera munyu zvishoma hazvibudi zvakanaka here.": "What if you add a little bit of salt—won't it turn out well?",
    "ndinonzwa nzara mangwanani kana ndisina kudya.": "I feel hungry in the morning if I have not eaten.",
    "ndiri kutsvaga makiyi angu asi handisi kuawona patafura.": "I am looking for my keys, but I do not see them on the table.",
    "tafura iyi inoda kupukutwa nokuti vana varasira mukaka pairi.": "This table needs to be wiped because the children spilled milk on it.",
    "wamboona bhuku rangu here? ndarisiya pedyo nepahwindo.": "Have you seen my book? I left it near the window.",
    "ndinoda kugara pasi zvangu kwemaminitsi mashoma ndimbonyarara.": "I just want to sit down for a few minutes and be quiet for a while.",
    "tine maminitsi mashanu chete saka ngatikurumidze kupedza zvatirikuita.": "We only have five minutes, so let us hurry and finish what we are doing.",
    "nhasi izuva rechitatu basa richiri kufamba zvakanaka chose.": "Today is the third day and the work is still going very well.",
    "ndachengeta mari shoma; kuti ndigozotenge zvimwe zvinhu mangwana.": "I have saved a little money so that I can buy some other things tomorrow.",
    "tsvaga mari yekubhadhara vashandi pakupera kwemwedzi.": "Find the money to pay the workers at the end of the month.",

    # manassehzw/sna-manasseh-150-raw (Family, Home, School & Present Progressive)
    "mwana ari kuchema mumba nokuti arumwa nenyuchi.": "The child is crying in the house because he was stung by a bee.",
    "mwana amuka achifara uye ave kuda kuenda kuchikoro manje.": "The child woke up happy and now wants to go to school.",
    "mwana uyu anoverenga zvakanaka uye anofarira kunyora nyaya pfupi.": "This child reads well and enjoys writing short stories.",
    "tichasangana naamai kumusika kana tapedza kutenga miriwo.": "We will meet Mother at the market when we finish buying vegetables.",
    "baba vari kugadzirisa chitofu chemumba chisiri kushanda.": "Father is repairing the kitchen stove that is not working.",
    "hanzvadzi yangu iri kuverenga saka tiri kutaura tichizevezera.": "My sibling is reading, so we are speaking in whispers.",
    "mbuya vari kurwara nhasi saka tiri kuenda kuvawona.": "Grandmother is feeling unwell today, so we are going to visit her.",
    "ndiri kufara nekuona shamwari dzangu dzepachikoro.": "I am happy to see my friends from school.",
    "ndakanganwa penzura yangu kumba asi shamwari yangu yandibatsira.": "I forgot my pencil at home, but my friend helped me.",
    "ndiri kunyora bvunzo dzangu dzekupedzisira svondo rino.": "I am writing my final examinations this week.",
    "tiri kudzokorora zvatakadzidza nezuro tisati tanyora bvunzo.": "We are reviewing what we learned yesterday before we write the exam.",
    "kirasi yanhasi yakanga yakanaka uye mudzidzisi akatsanangura zvose zvakanaka.": "Today's class was great and the teacher explained everything clearly.",
    "dzidza zvakawanda mazuva ose kuti uwedzere ruzivo.": "Study a lot every day so that you increase your knowledge.",
    "ndichamuka mangwanani kuti ndiwache hembe dzose dzasara.": "I will wake up in the morning to wash all the remaining clothes.",
    "mbatya dzangu dziri panze saka ndiri kuda kudziunganidza.": "My clothes are outside, so I want to gather them in.",
    "ndapedza basa rese saka rega ndimbozorora zvishoma.": "I have finished all the work, so let me rest for a little while.",
    "ndiri kuda kuzorora zvishoma ndisati ndaenderera mberi.": "I want to rest a little before I continue आगे.",
    "ndiri kuenda kubasa izvozvi kuti ndinotanga mazuva angu.": "I am going to work right now to start my shift.",
    "ndawana nzvimbo yakanaka yekugara iri pedyo nebasa.": "I have found a nice place to live that is close to work.",
    "tsvaga nzira iri nani yekugadzirisa dambudziko iri.": "Find a better way to solve this problem.",
    "kana tapedza izvi tichazorora todya zvakanaka tese.": "When we finish this, we will rest and then eat well together.",
    "uri kunzwa zvakanaka here kana kuti ndoita zvekudaidzira?": "Can you hear me well, or should I speak louder?",

    # manassehzw/sna-manasseh-150-raw (Weather, Nature, Farming, Travel & Longer Sentences)
    "kwedu kune makomo marefu anonakidza kuona.": "In our home region there are tall mountains that are wonderful to see.",
    "mvura iri kunaya zvakanyanya kunze uko nhasi.": "It is raining heavily outside there today.",
    "imbwa iri kuhukura panze pamwe pane chayaoona.": "The dog is barking outside; perhaps there is something it has seen.",
    "rwendo rwacho rwakareba asi tichasvika hedu.": "The journey itself is long, but we will get there safely.",
    "rima munda wako zvakanaka kuti uwane goho guru.": "Cultivate your field well so that you get a big harvest.",
    "mota yafa parwendo saka tiri kutsvaga rubatsiro.": "The car broke down on the trip, so we are looking for help.",
    "mazuvano kunze kuri kupisa zvakanyanya masikati.": "Nowadays it is very hot outside in the afternoon.",
    "rwizi rwuri kuyerera zvine simba saka musayambuke.": "The river is flowing with strong currents, so do not cross.",
    "rwizi rwuzere nemvura mushure mekunaya kwanezuro.": "The river is full of water after yesterday's rain.",
    "tiri kuronga rwendo rwemangwana rwekuenda harare.": "We are planning tomorrow's trip to Harare.",
    "tiri kuronga kuzogeza mota masikati zuva rikabuda.": "We are planning to wash the car in the afternoon when the sun comes out.",
    "mhepo iri kuvhuvhuta zvakasimba kubva kumabvazuva.": "The wind is blowing strongly from the east.",
    "kune makore akawanda saka kunogona kungonaya manheru.": "There are many clouds, so it might rain this evening.",
    "zuva ranyatsobuda nhasi; mbatya dziri kuoma nekukurumidza.": "The sun has come out brightly today; the clothes are drying quickly.",
    "nhasi zuva ririnani zvaro; asi mhepo iri kufefetera zvakasimba.": "Today the weather is fairly pleasant, though a strong breeze is blowing.",
    "nhasi kwaita mhute saka titochafamba tichinyatsotarisa nzira yedu.": "Today it is foggy, so we must travel while watching our path carefully.",
    "mvura yakatanga kunaya tichiri munzira saka takamhanya kupinda mumba.": "It started raining while we were still on the way, so we ran into the house.",
    "bhazi ranonoka nhasi; ndatozomhanya kuti ndisvike kubasa nenguva.": "The bus was late today; I had to run to get to work on time.",
    "mugwagwa wangauine makomba asi rwendo rwazofamba zvakanaka; pasina dambudziko.": "The road had potholes, but the journey went well without any problem.",
    "ndinokumbira undiratidze nzira inoenda kukiriniki iri pedyo.": "Please show me the way to the nearest clinic.",
    "tichabuda nenguva kuti tisazononoka kutanga musangano wedu wemangwanani.": "We will leave on time so that we are not late to start our morning meeting.",
    "ndasiya bhegi rangu kumashure kwemota saka ndinofanira kudzokera kunoritora.": "I left my bag in the back of the car, so I have to go back and get it.",
    "basa ranhasi rakawanda asi ndicharipedza zvishoma nezvishoma.": "Today's work is a lot, but I will finish it little by little.",
    "musangano watanga nenguva uye munhu wese anga akagadzirira.": "The meeting started on time and everyone was prepared.",
    "ndiri kunyora rondedzero pfupi pamusoro pebasa randakaita svondo rino.": "I am writing a short essay about the work I did this week.",
    "foni yangu yakadzima bhatiri saka handina kuona mashoko ako.": "My phone battery died, so I did not see your message.",
    "muviri wangu unonzwa kuremerwa saka ndiri kuda kuzorora nhasi.": "My body feels tired and heavy, so I want to rest today.",
    "ndiri kunwa mushonga mushure mekudya sezvandakaudzwa nachiremba.": "I am taking medicine after eating, just as I was told by the doctor.",
    "kana musoro ukaramba uchirwadza ndichaenda kukiriniki mangwana.": "If the headache keeps hurting, I will go to the clinic tomorrow.",
    "ndinogona kukudaiza kananguva yemusangano yakwana here?": "May I call you when it is time for the meeting?",
    "sei usina kundifonera pawakasvika pamba nezuro manheru?": "Why didn't you call me when you arrived home yesterday evening?",
    "vhenekera mwenje wako nokuti kwamuri kwakasviba zvikuru; hapana chandiri kuona.": "Shine your light because it is very dark where you are; I cannot see anything.",
    "ndafara zvikuru kukuona zvakare mushure memazuva akawanda.": "I am very happy to see you again after so many days.",
    "zvichiri zvakaoma zvikuru; asi ndinoziva kuti zvichanaka.": "It is still quite difficult, but I know that things will get better.",
    "nhasi zvinhu zvafamba zvakanaka kupfuura zvandaitarisira pakutanga.": "Today things went much better than I initially expected.",
    "masvingo ekare akavakwa nemadzitateguru edu achishandisa matombo asina dhaka.": "The ancient walls of Great Zimbabwe were built by our ancestors using stones without mortar.",
    "rwizi rwezambezi rwuripamuganhu pezimbabwe nezambia": "The Zambezi River lies on the border between Zimbabwe and Zambia.",
    "panguva yandakapedza zvidzidzo zvangu, ndakatanga kufunga nezvekugadzira kambani.": "When I finished my studies, I began thinking about starting a company.",
    "rwendo rwedu rwekuenda kumakomo rwakanakidza chaizvo, kunyangwe zvazvo takasangana nemvura yakawanda munzira, takazokwanisa kusvika tese mushe.": "Our trip to the mountains was truly wonderful; although we encountered heavy rain along the way, we all managed to arrive safely.",
    "ndinokumbira kuti utore magwaro ose ari patafura, uwaise mufaira riri pamubhedha.": "Please take all the documents on the table and put them in the file on the bed.",
    "kana tikashanda nesimba, tichibatsirana pachirongwa ichi, tinogona kupedza basa racho nenguva; tozowana mukana wekumbozorora tisati tatanga chimwe chidzidzo.": "If we work hard and help one another on this project, we can finish the work on time and then get a chance to rest before starting another lesson.",
    "vabereki vangu vakafara zvikuru, pandakavaudza kuti ndapasa bvunzo dzangu dzekupedzisira.": "My parents were overjoyed when I told them that I had passed my final examinations.",
    "mutambo webhora watakaona nezuro manheru waipisa zvikuru, uye vatambi vaitamba nehunyanzvi hunoshamisa; zvichiita kuti vanhu vese vaiva munhandare vafare.": "The football match we watched yesterday evening was thrilling, and the players played with amazing skill, making everyone in the stadium rejoice.",
    "handisati ndanyatsonzwisisa kuti chii chirikunetsa pafoni iyi, nokuti ndayedza kuibatidza kubvira mangwanani; asi iri kungoramba kubaka.": "I still have not fully understood what is wrong with this phone, because I have tried turning it on since morning, but it keeps refusing to power on.",
    "kutaura kwako nhasi kune hungwaru mukati, uye ndinobvumirana newe pane zvizhinji zvawataura.": "Your speech today carries deep wisdom, and I agree with you on most of what you have said.",
    "zuva rekutanga kubasa idzva, rinogara richityisa kune vanhu vazhinji; asi kana ukashinga, uye uchitaura nevamwe zvakanaka, unokurumidza kujaira nzvimbo yacho pasina nguva.": "The first day at a new job is always intimidating for many people, but if you are brave and speak kindly with others, you quickly get used to the place in no time.",
    "imbwa yedu yakatanga kuhukura pakati pehusiku, ichivhundutsa vanhu vese vanga vakarara; zvakazoita kuti ndimuke, ndibude panze kuti ndione kana paiva nembavha.": "Our dog started barking in the middle of the night, startling everyone who was asleep, which made me wake up and go outside to see if there was a thief.",
    "mwedzi unouya, tiri kuronga kuenda kumusha kunoona mbuya nasekuru vedu; nokuti pava nenguva refu tisati tasangana navo.": "Next month, we are planning to go to the rural home to visit our grandmother and grandfather, because it has been a long time since we last met them.",
    "ndanzwa nerunyerekupe kuti mitengo yezvinhu muzvitoro iri kuramba ichikwira mazuva ano.": "I heard through rumors that the prices of goods in the shops keep rising nowadays.",
    "paunenge uchiverenga bhuku iri, nyatsoteerera mazwi akashandiswa nemunyori; nokuti ane udzamu, uye anopa dzidziso yakakosha inoshanda muupenyu hwedu hwemazuva ose.": "While you are reading this book, pay close attention to the words used by the author, because they have depth and offer valuable lessons that apply to our everyday lives.",
    "ndaedza kumufonera kakawanda nhasi masikati, asi nharembozha yake yairamba ichiti haina kubatika.": "I tried calling him many times this afternoon, but his mobile phone kept saying it was unreachable.",
    "nguzozo dzekare dzaishandiswa kuchengetera zviyo nemapfunde mushure mekukohwa.": "Traditional granaries were used to store finger millet and sorghum after the harvest.",
    "mambo munhumutapa aiva mutungamiri airemekedzwa zvikuru munyika yese.": "King Munhumutapa was a deeply respected leader throughout the entire land.",
    "wakamboenda kunzvimbo dzinochengetedza nhoroondo dzenyika yedu yekare here?": "Have you ever visited the heritage sites that preserve the ancient history of our country?",
    "humambo hwerozvi hwaizivikanwa neuto ravo raigona kurwa hondo.": "The Rozvi Empire was renowned for its army that was skilled in warfare.",
    "madzitateguru edu aishandisa uta nemiseve kana vachienda kunovhima musango.": "Our ancestors used bows and arrows when they went hunting in the forest.",
    "nhoroondo dzekare dzinotidzidzisa kwatakabva netsika dzedu semashona.": "Ancient history teaches us where we came from and our traditions as Shona people.",
    "vakataura pamusoro pegamba renyika rakarwira rusununguko rwedu here?": "Did they speak about the national hero who fought for our independence?",
    "chaminuka aive svikiro guru raiporofita zvaizoitika munyika mazuva aizouya.": "Chaminuka was a great spirit medium who prophesied what would happen in the land in future days.",
    "vanhu vaitengeserana nyanga dzenzou nendarama nevatorwa vaibva kure.": "People traded ivory and gold with foreign merchants who came from afar.",
    "pane anoziva kuti zita rekuti zimbabwe rakabva pazvivakwa zvematombo here?": "Does anyone know that the name Zimbabwe came from the houses of stone?",
    "mbuya nehanda vakatungamirira vanhu pakurwira nyika yavo kubva kuvachena.": "Mbuya Nehanda led the people in fighting for their land.",
    "kare vanhu vairima mapfunde nezviyo vasati vatanga kurima chibage.": "Long ago, people cultivated sorghum and finger millet before they started growing maize.",
    "wakanzwa nyaya yengano yetsuro negudo yataitaurirwa naambuya here?": "Did you hear the folktale about the hare and the baboon that grandmother used to tell us?",
    "madzimambo ekare aigara mumizinda yakakomberedzwa nemadziro ematombo.": "Ancient kings lived in royal courts surrounded by stone walls.",
    "munguva yamadzimambo vanhu vaibvisa mutero vachishandisa zvipfuyo here?": "In the time of the kings, did people pay tribute using livestock?",
    "kugadzira masimbi kwaida hunyanzvi hukuru, hwaishandiswa kugadzira mapfumo.": "Forging iron required great craftsmanship, which was used to make spears.",
    "nziyo dzechinyakare dzayiimbwa panguva dzekukohwa kana parufu.": "Traditional songs were sung during harvest times or at funerals.",
    "mudzidzisi wepachikoro akakutsanangurirai nezvekutama kwemabantu here?": "Did the schoolteacher explain the Bantu migration to you?",
    "vashona vaive mhizha dzaigona kuumba hari dzakanaka dzevhu.": "The Shona people were skilled artisans who could mold beautiful clay pots.",
    "lobengula aiva mambo wemandevere aigara mubulawayo panguva iyoyo.": "Lobengula was the Ndebele king who lived in Bulawayo at that time.",
    "unofunga kuti kurarama kwemazuva ekare kwaive nani pane kwanhasi here?": "Do you think life in the old days was better than life today?",
    "misha yechinyakare yaivakwa nembariro ichipwigirwa nehuswa kwete marata.": "Traditional homesteads were built with wooden poles and thatched with grass rather than metal sheets.",
    "baba vako vakambokutaurira nhoroondo yedzinza remhuri yenyu here?": "Has your father ever told you the history of your family's lineage?",
    "varume vaigara padare vachitonga mhosva nekudzidzisa vakomana tsika.": "Men used to sit at the village council settling disputes and teaching boys good customs.",
    "vakadzi vaienda kutsime kunotora mvura vachitaurirana nyaya dzavo.": "Women used to go to the well to fetch water while sharing their stories with one another.",
    "kune magwaro akanyorwa nezveumambo hwemutapa kuchikoro kwenyu here?": "Are there books written about the Mutapa kingdom at your school?",
    "doro remazhanje neremakumbi zvinwiwa zvaidiwa munguva yezhizha.": "Wild loquat brew and marula fruit drink were popular beverages during the rainy summer season.",
    "hondo yechimurenga yakatanga apo vanhu vakaramba kudzvanyirirwa.": "The Chimurenga struggle began when the people refused to be oppressed.",
    "unogona kududza mazita emadzimambo akatonga munyika ino here?": "Can you name the kings who ruled in this land?",
    "makomo ekumatobo ane mapako ane mifananidzo yakatarwa kare kare.": "The Matobo Hills have caves with rock paintings drawn long ago.",
    "vana vaitamba mahumbwe vachidzidzira mabasa ehunyanzvi hwevakuru.": "Children used to play house, practicing the skilled chores of adults.",
    "zvaibvumidzwa kuti munhu aroore vakadzi vakawanda munguva yechinyakare here?": "Was it permitted for a person to marry multiple wives in traditional times?",
    "nzira dzekurapa dzechinyakare dzaishandisa midzi nemakwati emiti.": "Traditional healing methods used roots and tree bark.",
    "une chokwadi here kuti ivhu iri ndiro rairimirwa nemadzitateguru edu here?": "Are you certain that this land is the very soil farmed by our ancestors?",
    "varungu pavakasvika vakatora minda yakanaka yevatema nechisimba.": "When the settlers arrived, they seized the fertile farmlands by force.",
    "zvirevo nemadimikira zvaishandiswa kupanana mazano akadzama.": "Proverbs and idioms were used to share deep advice with one another.",
    "rwendo rwekudzidza nhoroondo rwabatsira kuti unzwisise tsika dzedu here?": "Has the journey of learning history helped you understand our culture?",
    "ndiri kugadzira chirongwa chitsva chichabatsira vanhu.": "I am creating a new program that will help people.",
}


# Complete sentence-by-sentence bilingual breakdown for the multi-sentence passages
# in takuM23/shona-vibevoice-corpus (ranging from 16s to 85s / 1.4m).
# Keyed by lowercase prefix of the passage for exact matching.
VIBEVOICE_PASSAGE_TRANSLATIONS: list[dict[str, object]] = [
    {
        "match": "mureza wenyika une mavara matatu",
        "full_english": "The national flag has three colours: white, light red, and green. It features a reddish circle set upon the white band in the centre.",
        "sentences": [
            ("Mureza wenyika une mavara matatu anoti, ruvara ruchena, rwakatsvukuruka uye ruvara rwebundo.", "The national flag has three colours: white, light red, and green."),
            ("Rine dendenedzwa rine ruvara rwakatsvukuruka paruvara ruchena rwuri pakati.", "It has a reddish circle on the white stripe in the middle."),
        ],
    },
    {
        "match": "chinanasi chakadyarwa uye chinoratidza",
        "full_english": "A pineapple has been planted and looks well-watered and ripe. It has a light-coloured body with dark markings. At the top, it has a crown with green leaves. The leaves of this pineapple are a deep, vibrant green.",
        "sentences": [
            ("Chinanasi chakadyarwa uye chinoratidza kuti chakanatsoguta mvura chakasvika.", "A pineapple has been planted and looks well-watered and ripe."),
            ("Chinerurava ruchena chobva chaita mavara matema.", "It has a light-coloured surface with dark markings."),
            ("Nechekumusoro kwacho chineruva riripamusoro rineruvara rwegirini.", "Towards the top, it has a crown with a green colour."),
            ("Chinanasi ichi mashizha achona aneruvara rwegirini yakasvibira.", "The leaves of this pineapple are a deep dark green."),
        ],
    },
    {
        "match": "madhongi pane madhongi maviri",
        "full_english": "There are two donkeys. These donkeys are pulling a cart. Inside the cart sits a man wearing a hat, and the cart is travelling along an unpaved dirt road.",
        "sentences": [
            ("Madhongi pane madhongi maviri.", "There are two donkeys."),
            ("Madhongi aya arikudhonza ngoro.", "These donkeys are pulling a cart."),
            ("Mungoro munemurume akagara akapfeka ngohwani uye ngoro irikufamba pamugwagwa usina tara.", "In the cart sits a man wearing a hat, and the cart is moving along an untarred road."),
        ],
    },
    {
        "match": "mugwagwa wakapamhamha une tara",
        "full_english": "A wide tarred road shows cars passing each other in opposite directions. Along the edge of this road stand large, mature trees. Beneath these trees lies dry grass that looks as though it has not been rained on for a long time.",
        "sentences": [
            ("Mugwagwa wakapamhamha une tara unoratidza kuti une motokari dzirikupesana.", "A wide tarred road shows cars passing one another."),
            ("Mujinga memugwagwa uyu mune miti mikuru inokuratidza kuti yakomba.", "Along the side of this road there are large trees that look mature."),
            ("Pasi pamiti iyi pane sora rakaoma rinoratidza kuti rava nenguva risati rambonaiwa nemvura.", "Under these trees is dry grass showing that it has gone a long time without rain."),
        ],
    },
    {
        "match": "nzvimbo inoratidzika kuti mudhorobha",
        "full_english": "The place looks like a city centre. Multi-storey buildings rise further ahead in the distance. This area also has many people walking about. Along the side, there are vendors selling a variety of goods.",
        "sentences": [
            ("Nzvimbo inoratidzika kuti mudhorobha.", "The place appears to be in town."),
            ("Pane zvivakwa zvokudurikidzwa zviri kubudikira nechekumberi mberi.", "There are multi-storey buildings rising further ahead."),
            ("Nzvimbo iyi inewo vanhu vakawanda.", "This area also has many people."),
            ("Necheparutivi panewo vari kuita zvokutengesa zvinhu zvakasiyana siyana.", "Off to the side, there are people selling various goods."),
        ],
    },
    {
        "match": "kombi chena iri kuratidza kuti yakatakura",
        "full_english": "A white commuter omnibus (kombi) is carrying passengers and driving along the road. Next to the kombi stands a huge tree with lush dark-green leaves. Nearby, residential buildings can also be seen where people live.",
        "sentences": [
            ("Kombi chena iri kuratidza kuti yakatakura vanhu uye iri kufamba mumugwagwa.", "A white commuter minibus is carrying passengers and travelling along the road."),
            ("Padivi pekombi iyi pane zimuti zihombe riri kuratidza kuti rine mashizha akasvibira zvikuru.", "Beside this minibus stands a huge tree with very lush green leaves."),
            ("Pari kuonewo zvivakwa zviri kuratidza kuti panogara vanhu.", "Residential buildings can also be seen showing that people live there."),
        ],
    },
    {
        "match": "michero nemiriwo yakarogedzwa panzvimbo imwe chete",
        "full_english": "Fruits and vegetables are neatly arranged together in one place on a white surface. They include tomatoes and apples. Eating fresh fruits helps the body fight against illness.",
        "sentences": [
            ("Michero nemiriwo yakarogedzwa panzvimbo imwe chete.", "Fruits and vegetables are arranged together in one place."),
            ("Yakaiswa pauriri huchena.", "They are placed on a clean white surface."),
            ("Inosanganisira madomasi nemaapuro.", "They include tomatoes and apples."),
            ("Michero inobatsira kurwisana nezvirwere mumuviri.", "Fruits help fight diseases in the body."),
        ],
    },
    {
        "match": "mbatya dziri kutengeswa dzakaunganidzwa pasi",
        "full_english": "Clothes for sale are gathered on the ground. One person wearing black clothes is standing nearby, while two others are seated on the ground. One of them is wearing a red top and a hat, and a car can be seen in the background.",
        "sentences": [
            ("Mbatya dziri kutengeswa dzakaunganidzwa pasi.", "Clothes for sale are piled on the ground."),
            ("Munhu mumwe chete akapfeka hembe dzitema akamira.", "One person wearing dark clothes is standing."),
            ("Vaviri vakagara pasi.", "Two people are sitting on the ground."),
            ("Mumwe ane hembe itsvuku kumusoro akapfeka ngowani. Motikari iri kubudikira.", "One has a red shirt on top and is wearing a hat, while a car appears in the background."),
        ],
    },
    {
        "match": "imba hombe yokutandarira yakashongedzwa",
        "full_english": "A spacious living room is beautifully decorated. It has a long, comfortable sofa in a bright orange colour with three cushions. There is also a carved wooden coffee table in front.",
        "sentences": [
            ("Imba hombe yokutandarira yakashongedzwa.", "A large living room is nicely decorated."),
            ("Ine chigaro chomutefetefe chirefu chine ruvara rwakajeka rweorenji.", "It has a long, soft sofa with a bright orange colour."),
            ("Chinewo mitsago mitatu. Panewo tafura ine chivezwa pamusoro.", "It also has three cushions, and there is a table with a carving on top."),
        ],
    },
    {
        "match": "rori huru ine musoro muchena nekumasure kutema",
        "full_english": "A large truck has a white cab in front and a black rear body. This truck appears to work primarily at the mines where minerals are extracted, and it can tip its load by itself as it raises its rear tray.",
        "sentences": [
            ("Rori huru ine musoro muchena nekumasure kutema.", "A large truck has a white front cab and a black rear."),
            ("Rori iyi inoratidza kuti inonyanya kushanda kuma maini kuya kunocherwa zvicherwa uye inokwanisa kuzvitutunura yoga sezvo ichisumudza zidishi rayo rekumashure.", "This truck mainly works at the mines where minerals are dug, and it can unload itself by raising its large rear tray."),
        ],
    },
    {
        "match": "tebhuro yekagadzikwawo girazi pamusoro payo",
        "full_english": "A table has a glass placed upon it containing a drink, alongside another drink still in a bottle. There is also an ice tray used for freezing water in the refrigerator into ice cubes, some of which can be seen resting beside the glass.",
        "sentences": [
            ("Tebhuro yekagadzikwawo girazi pamusoro payo iro rakaiswawo dhiringi mukati pamwe chete nerimwe richiri muchigubhu.", "A table has a glass set on top of it with a drink inside, together with another still in a bottle."),
            ("Zvakare pane tureyiwo iyo inoiswa mvura yoiswa mufiriji kuti izooma yakaita magodo ayo arikuonekwawo mamwe akaiswa nechepasi padivi pegirazi.", "There is also a tray in which water is placed and put in the fridge to freeze into ice cubes, some of which are visible beside the glass."),
        ],
    },
    {
        "match": "zvipembere zvirikufamba zviri zvitatatu",
        "full_english": "Three rhinoceroses are walking together. All of them are large, though the one on the left is slightly smaller in build. Their prominent front horns are clearly visible, and their ears stand alert while tilting slightly back. Behind them are grass and bushes, showing that they are roaming this area in search of food.",
        "sentences": [
            ("Zvipembere zvirikufamba zviri zvitatatu.", "Three rhinoceroses are walking together."),
            ("Zvese zvakakura asi panechimwe chirikurutivi rwekuruboshwe chakada kuti mhumhu wakaita mudiki zvishoma.", "All of them are large, but the one on the left side is slightly smaller in size."),
            ("Mazinyanga ekumberi kwazvo arikuoneka. Uyewo nzeve dzakamira dzimwe dzichiita sedzakarereka dzichidzokera shure zvishoma.", "Their large front horns are visible, and their ears stand upright while tilting slightly backward."),
            ("Kuseri kwazvo kunemauswa nezvikwenzi zviripo kuratidza kuti zvirikufamba munzvimbo umu kuti zviwane chekudya.", "Behind them are grass and bushes, showing that they are walking through this area to find food."),
        ],
    },
    {
        "match": "pane mahara maviri nefoko ine musoro mutema",
        "full_english": "There are two rakes and one garden fork with a black head. All of them have wooden handles. Off to the side, there are two shovels—one with a rusted blade and the other with a bright metal blade—all resting on stony ground.",
        "sentences": [
            ("Pane mahara maviri nefoko ine musoro mutema imwechete. Zvose zvine mibato yemuti.", "There are two rakes and one garden fork with a black head, and all of them have wooden handles."),
            ("Parutivi pane mafoshoro maviri. Imwe ine musoro une ngura. Imwe ine musoro muchena. Zvose zviri pasi pane matombo.", "On the side are two shovels—one with a rusty head and one with a bright head—all lying on rocky ground."),
        ],
    },
    {
        "match": "maruva ane ruvara rwegirinhi yakachenuruka",
        "full_english": "Plants with pale green leaves are planted in a light-green pot. This pot is set upon a cement floor, and two chains pass right beside it.",
        "sentences": [
            ("Maruva ane ruvara rwegirinhi yakachenuruka akadyarwa mugaba rine ruvara rwegirinhi yakachenuruka zvakare.", "Plants with light green foliage are planted in a pale green container."),
            ("Gaba iri rakagadzikwa pamusoro peuriri hwesimende uye pane cheni mbiri dziri kudarika neparitivi paro.", "This container is placed on a cement floor, and two chains run alongside it."),
        ],
    },
    {
        "match": "vanhu varikutengesa vakawarira pasi zvinhu zvakawanda",
        "full_english": "Vendors are selling many items spread out on the ground, such as hats, pegs, brushes, and other household wares. Men and women are seated nearby, while shoppers walk past carrying shopping bags showing they have bought their goods and are heading home. Beside them stand structures built of timber and corrugated iron.",
        "sentences": [
            ("Vanhu varikutengesa vakawarira pasi zvinhu zvakawanda zvakafanana namaheti , namapegisi, mabhurashi nezvimwe zvakawanda.", "People are selling many goods spread out on the ground, such as hats, clothes pegs, brushes, and much more."),
            ("Pane vanhurume vakagara nevanhukadzi.", "There are men and women seated there."),
            ("Vamwe varikufamba vane mashan'ani bhegi kuratidza kuti vatenga zvinhu zvavo, vavekuenda.", "Others are walking with carrier bags showing they have bought their items and are now leaving."),
            ("Nechekurutivi kune zvakavakwa zvamapuranga namarata ariko.", "Off to the side there are structures built of wooden planks and metal roofing sheets."),
        ],
    },
    {
        "match": "mugwagwa wetara urikupfuura motokari",
        "full_english": "Cars are travelling along a tarred road, some heading in one direction and others in the opposite direction. Along the roadside stand trees bursting into green leaf, while others have many branches. Inside a nearby shop, stationery items are being sold, including glue for pasting paper, books, and pens.",
        "sentences": [
            ("Mugwagwa wetara urikupfuura motokari. Dzimwe dzinopesana dzichienda kune rumwe rutivi dzimwe dzichienda kune rumwe rutivi.", "Cars are passing along a tarred road, some going in one direction and others in the opposite direction."),
            ("Miti irikumativi emugwagwa imwe iri kupfumvutira ine mashizha egirinhi. Imwe ine mhandi dzakawanda wanda.", "Some of the trees along the roadside are sprouting fresh green leaves, while others have many branches."),
            ("Zvinhu zviri kutengeswa muchitoro zvinosanganisira shuru shuru yokunama mapepa, mabhuku pamwe chete nezvinyoreso.", "Items being sold in the shop include glue for sticking paper, books, as well as pens."),
        ],
    },
    {
        "match": "shangu yakagadzikwa parutivi rwematayera",
        "full_english": "A brown shoe is placed beside the tiles; its interior is also brown and it has a small metal buckle on top, with a pointed toe that covers all the toes when worn. Nearby, many people of different ages—both men and women—are engaged in various activities: some standing, some walking, and others selling assorted goods.",
        "sentences": [
            ("Shangu yakagadzikwa parutivi rwematayera ndeye bhurauni mukati mayowo muri bhurauni ine kasimbi pamusoro kumberi kwayo kwakatesvera uye kunovhara zvigunwe zvese kana yakapfekwa.", "A shoe placed beside the tiles is brown inside and out, with a small metal clasp on top and a pointed front that covers the toes when worn."),
            ("Vanhu vazhinji vane mizera yakasiyana vanosanganisira varume nevakadzi varikuita zvakasiyana vamwe vakamira vamwe vari kufamba vamwe ndivo vari kuratidza kuti vari kutengesa zvinhu zvakasiyana.", "Many people of different ages, including men and women, are doing various things: some standing, some walking, and others selling different goods."),
        ],
    },
    {
        "match": "nzvimbo inogona kuwanikwa muguta ine mugwagwa",
        "full_english": "An urban scene features a tarred road with several cars, street lights, and billboards where businesses advertise their goods. Further ahead, houses and tall well-tended trees are visible, while down near the stones lies a green caterpillar.",
        "sentences": [
            ("Nzvimbo inogona kuwanikwa muguta ine mugwagwa wakaiswa tara uyewo pane motokari dzakati wandei, mugwagwa wacho wakaiswa mwenje uye une zvikwangwari zvevanhu vanoshambadza zvinhu.", "An urban area has a tarred road with several cars, street lights, and billboards of people advertising goods."),
            ("Kumberi kurikuonekwawo dzimba , kunewo miti yakareba irikutarisirwa.", "Further ahead houses can be seen, along with tall trees that are well cared for."),
            ("Gonye rine ruvara rwegirini riri pasi padyo namatombo.", "A green caterpillar is on the ground near the stones."),
        ],
    },
    {
        "match": "musha wakapakwa mota yerudzi rutema",
        "full_english": "At a homestead, a black car is parked near a peach tree with green leaves, and on top of the wall many neatly stacked bricks can be seen. A large haulage truck (gonyeti) with a red and silver cab is parked by the road. Across the way stands an office-like building with orange and white walls surrounded by tall growing trees.",
        "sentences": [
            ("Musha wakapakwa mota yerudzi rutema, pane muti wemupichisi une mashizha akasvibira uyewo pamusoro pejurahoro panoonekwa zvidhinha zvakarongwa zvakawandira mukati.", "At a home where a black car is parked, there is a peach tree with green leaves and bricks stacked neatly by the perimeter wall."),
            ("Motikari yakamira pamumugwagwa inozivikanwa ichinzi gonyeti. Ine musoro muhombe ine ruvara rutsvuku nesirivha.", "A large truck parked on the road, known as a haulage truck (gonyeti), has a big red and silver cab."),
            ("Pamhiri pari kuonekwa imba yakavakwa ichiita kunge mahofisi ine midhuri yeruvara rweorenji nezvichena nemiti iri kureba iri kumera ipapo.", "Across the way stands a building that looks like offices with orange and white walls and tall trees growing there."),
        ],
    },
    {
        "match": "imba huru yakavakwa nehunyanzvi yakanaka",
        "full_english": "A large house is built with impressive craftsmanship and beauty. Beside this house stands a large water storage tank—commonly called a Jojo tank—mounted high up to store water for the household. Up in the sky, dark clouds gather, showing that rain may soon fall. Inside a shop, new stationery items of various types and colours are neatly displayed on shelves for sale.",
        "sentences": [
            ("Imba huru yakavakwa nehunyanzvi yakanaka zvinomwisa mvura.", "A large house is built with admirable skill and beauty."),
            ("Parutivi rwemba iyi pane zigumbure ziguru rinoshandiswa nevazhinji kuchengetera mvura rakaiswa mudenga rinodaidzwa nokuti Jojo tank.", "Beside this house is a large tank used by many people to store water, mounted high up and known as a Jojo tank."),
            ("Nechemuchadenga tirikuona makore akasviba arikuratidza kuti angangonaya mvura .", "Up in the sky we see dark clouds indicating that it might rain soon."),
            ("Zvinhu zvesiteshenari zvinowanzoshandiswa muzvikoro nemumahofisi kana kune dzimwe nzvimbo. Zvitsva. Zvakatoturikwa pamasherefu pazvo kuratidza kuti zviri kutengesewa. Zvine marudzi nemavara akasiyana.", "Stationery items commonly used in schools and offices are brand new and arranged on shelves for sale in various types and colours."),
        ],
    },
    {
        "match": "vanhu vazhinji, varume nevakadzi varikuratidza kuti varikufamba",
        "full_english": "Many people—men and women—are walking past a wall; a woman in front is wearing white shoes and denim trousers while holding a mobile phone in her right hand to her ear as she speaks. Nearby stand four men and one woman: one man in a white shirt looks ahead as if speaking, while the woman rests her chin in her hand looking thoughtful.",
        "sentences": [
            ("Vanhu vazhinji, varume nevakadzi varikuratidza kuti varikufamba vachipinda nepasi pemudhuri.", "Many people, men and women, are walking past the base of a wall."),
            ("Mumwe mukadzi arikumberi akapfeka shangu chena nemudhebhe wesatani watingati ndewe jini akabata mbozhanhare neruoko rwake rwerudyi, arikuratidza kuti arikutotaura nemunhu pambozhanhare yacho, sezvo akaiisa panzeve yokuruoko rwerudyi.", "A woman in front is wearing white shoes and jeans, holding a mobile phone in her right hand against her right ear as she speaks to someone."),
            ("Pane varume vana murume nemudzimai mumwechete murume mumwe akapfeka chipika chichena akatarisa kumberi kunoiita kunge munhu ari kutaura.", "There are four men and one woman; one man wearing a white T-shirt is looking forward as if speaking."),
            ("Mudzimai akabata chirebvu chake achitaridza kusuruvara.", "The woman is holding her chin, looking pensive."),
        ],
    },
    {
        "match": "munhukadzi ari kugadzirwa musoro wake",
        "full_english": "A woman is having her hair styled. Her face is not visible, but a stylist's hand can be seen braiding her hair into neat twists that fall toward her shoulders. The hair is black at the roots and reddish-brown toward the tips, looking soft and treated. In another scene, two football players in matching uniforms—one wearing a white cap—are training and competing to kick the ball on the ground.",
        "sentences": [
            ("Munhukadzi ari kugadzirwa musoro wake. Uso hwake hausi kuonekwa asi pane ruoko rwuri mumusoro runoita senge ndiro ruri kugadzira bvudzi.", "A woman is having her hair styled; her face is not visible, but a hand can be seen working on her hair."),
            ("Ari kumonwa tumabhanzi turi kuinda tuchidonhera kusvika nechekuda kuenzana namapendekete. Bvudzi idema pasi asi pamusoro rakatsvukuruka. Rakapfava zvinoratidza kuti rakaiswa mushonga.", "Her hair is being twisted into braids falling near her shoulders; it is black at the base and reddish-brown on top, looking soft and conditioned."),
            ("Vanhu vaviri vomutambo wonhabvu. Vakapfeka mayunifomu akafanana. Umwe chete akaisa chichena pamusoro. Vanoratidza kuti varipakudzidzira mutambo wawo uye vose vari kukwikwidzana kuti vagone kukava bhora riri nechepasi.", "Two football players in matching uniforms are practicing their sport and competing to kick the ball on the ground."),
        ],
    },
    {
        "match": "vanhu vari kutengesa zvinodyiwa navanhu",
        "full_english": "Vendors are selling edible produce such as pineapples, bananas, and apples. Some sit under umbrellas to shield themselves from the sun while cars pass along the road. In the town centre near a tall tree, two people sit on the ground—a man in a red top and a woman in a white hat—while another person walks by carrying a black bag. Nearby, black-eyed cowpeas (nyemba) with white eyes are heaped on a clean surface.",
        "sentences": [
            ("Vanhu vari kutengesa zvinodyiwa navanhu zvakaitawo semichero zvinanazi, mabhanana uye maapuro.", "People are selling food items such as pineapples, bananas, and apples."),
            ("Vamwe vakafugawo masumburena anoita kuti vasatsva nezuva uye zvakare mugwagwa unofambawo dzimotokari.", "Some are shaded under umbrellas so they do not burn in the sun, while cars travel along the road."),
            ("Vanhu vari kufamba vari pakati pedhorobha. Pari kuonekwa pane muti wakarebenuka. Zvakare pane vanhu vaviri vakagara pasi, murume akapfeka hembe yekumusoro yeruvara rutsvuku nemukadzi akapfeka nguwani yeruvara ruchena.", "People are walking in the town centre near a tall tree, and two people are seated on the ground—a man in a red shirt and a woman in a white hat."),
            ("Pari kuonekwa zvakare pane munhu ari kufamba akatakura bhegi reruvara rutema. Nyemba dzakawanda dzakaunganidzwa pasi pachena. Dzine ruvara rutema. Kumuromo kwadzo kune ruvara ruchena.", "A person is also seen walking with a black bag, while many black cowpeas with white tips are piled on a clean surface."),
        ],
    },
    {
        "match": "pakati pevanhu vari kufamba muguta parutivi",
        "full_english": "Among the people walking along the city pavement is a man wearing a red shirt, white trousers, and black shoes. Nearby stand two tuckshops—one painted white and the other painted green with lettering on top—situated close to some rocks. Inside a furniture store, two white-painted household cabinets with decorative front patterns are displayed for sale to beautify a home.",
        "sentences": [
            ("Pakati pevanhu vari kufamba muguta parutivi rwemugwagwae pane murume akapfeka hembe yeruvara rutsvuku nomudhebhe weruvara ruchena pamwe chete neshangu dziri muruvara rutema.", "Among the people walking along the side of the city road is a man wearing a red shirt, white trousers, and black shoes."),
            ("Matakishopu maviri. Imwe yakapendwa nependi chena imwe yakapendwa nependi yegirinhi uye pamusoro yakanyorwa. Zvekare matakishopu aya ari pedo nematombo.", "There are two small shops (tuckshops): one painted white and the other painted green with writing on top, located near some stones."),
            ("Midziyo yomumba kana kuti makabati maviri arimuchitoro arikutengeswa. Makabati acho akapendwa nependi chena, uye akaiswa mapatani mapatani mberi, kuitira kunakisa mumba maanenge aiswa.", "Household furniture—two cabinets inside a store—are on sale, painted white with decorative patterns on the front to beautify the room where they are placed."),
        ],
    },
    {
        "match": "turusi mana akagadzikwa pasi paneruvara rwekirimu",
        "full_english": "Four farm tools are laid out on a worn cream-coloured surface. These tools include a hoe with a long wooden handle, a slasher, a knife, and a grass cutter. At the market, two women sit beneath an umbrella that is black on top with cream sides. They are wearing different tops—one red and the other green with white trim. Nearby, a pair of closed black women's shoes rests on white and blue tiles.",
        "sentences": [
            ("Turusi mana akagadzikwa pasi paneruvara rwekirimu uye pakasakara.", "Four tools are placed on the ground on a worn cream-coloured surface."),
            ("Maturusi aya anosanganisira badza rinemubato wepuranga wakareba, nebhemba nebanga, uyezve nechekuchekesa sora.", "These tools include a hoe with a long wooden handle, a machete/slasher, a knife, and a grass cutter."),
            ("Madzimai maviri akagara pasi pe amburera vari pamusika. Vakafuka amburera ineruvara rutema pamusoro neruvara rwe kirimu kumativi.", "Two women are sitting under an umbrella at the market; the umbrella is black on top and cream on the sides."),
            ("Madzimai maviri aya akapfeka nguwo dzekumusoro dzakasiyana. Umwe ane nguwo ine ruvara rutsvuku mumwe ane nguwo ine ruvara rwe girinhi. Nemipendero ine ruvara ruchena.", "These two women are wearing different tops: one has a red top and the other has a green top with white borders."),
            ("Shangu mbiri dzechidzimai dzakavharika. Dzitema dzakagadzikwa pasi pane mataira ane mavara machena neebhuru.", "Two closed women's shoes in black are placed on the floor on white and blue tiles."),
        ],
    },
    {
        "match": "vanhu vakaungana mubani vese vane migomo",
        "full_english": "People have gathered in an open field carrying buckets and containers to fetch water, beside a raised Jojo water tank mounted on a brick stand from which they draw water. Nearby grows a variety of trees including a mango tree with green leaves, alongside flowers with green leaves and pink blossoms near a fence. A light-complexioned woman has neatly styled her eyebrows, applied makeup, put on white earrings and a sleeveless black-and-white top, and tied her hair back.",
        "sentences": [
            ("Vanhu vakaungana mubani vese vane migomo zvinove zvigubu zvekuratidza kuti varikucherera mvura parutivi pavo pane Jojo tengi rakavakirwa pamusoro rikatsveta pamusoro pechi mudhuri zvichiratidza kuti ndimo murikubva mvura yavari kuchereredza.", "People gathered in the open plain all have buckets and containers to fetch water from a raised Jojo water tank mounted on a small wall beside them."),
            ("Nzvimbo inemiti yakasiyana siyana inosanganisira muti wemumango. Muti wemumango una mashizha aneruvara rwegirinhi.", "The area has various trees including a mango tree, which has green leaves."),
            ("Koita zvakare maruva aripedyo neruzhowa. Maruva aya anamashizha aneruvara rwegirinhi neruvara rwepingi.", "There are also flowers near the fence with green leaves and pink petals."),
            ("Mudzimai mutsvuku akashongedza kumeso kwake akanyora tsiye dzake zvakanaka akapenda kumeso kwake nokupenda miromo yake akapfeka mhete munzeve make dzeruvara ruchena akapfeka hembe isina maoko neruvara ruchena neruvara rutema akagadzira musoro wake zvakanaka.", "A woman has neatly groomed her face and eyebrows, wearing white earrings and a sleeveless black-and-white top with her hair styled neatly."),
        ],
    },
    {
        "match": "munhukadzi mumwe chete akamira akabata muchiuno",
        "full_english": "One woman stands with her hands on her waist; she has thick dark hair and wears many bangles on her wrist. At a potato market in the evening, vendors in overalls and red tops sit selling produce to standing customers, enjoying their work to earn a living. Overhead, two birds perch on four electric power lines attached to a large pole near pawpaw trees.",
        "sentences": [
            ("Munhukadzi mumwe chete akamira akabata muchiuno chake. Ane musoro une bvudzi rakawanda rakasvibira ritema. Maziso ake akapendewa nebhuruu. Muruoko akapfeka zvindarira zvakawanda.", "One woman is standing with her hand on her waist; she has thick black hair and wears many bangles on her arm."),
            ("Musika wembatatisi unoonekwa mune rima imomo. Vanhu vane mahovhorosi vakagara pasi vachitengesera vakamira uye vakapfekawo zvitsvuku vanofarira basa ravo rekuti vaite mari yekuvapa pundutso.", "A potato market is seen there; vendors in overalls and red tops sit on the ground selling to standing customers, enjoying their work to earn a livelihood."),
            ("Shiri dzakamhara patambo dzemagetsi. Shiri idzi imbiri. Pane tambo dzemagetsi ina, uye panezidanda zihombe rakaiswa tambo idzi. Panewo miti unemapopo.", "Two birds are perched on four electric power lines mounted on a large pole, and there are also pawpaw trees nearby."),
        ],
    },
    {
        "match": "munhurume wechiafrica akamira akabata machira",
        "full_english": "An African man stands holding three-coloured cloths to decorate the place where he stands. Three golden, healthy-looking potatoes rest on a white board—one large and the others smaller. A wooden bowl is filled with mopane caterpillars (madora), well-roasted and mixed with tomatoes and onions. Nearby, heaps of excavated soil indicate a mining area where minerals are dug from underground.",
        "sentences": [
            ("Munhurume wechiAfrica akamira akabata machira ane ruvara rutatu achiratidza kudhekoreta panzvimbo yaakamira.", "An African man is standing holding cloths of three colours, decorating the place where he stands."),
            ("Mbatatisi nhatu dziri pabhodhi rineruvara ruchena idzo dzine ruvara rwakaita goridhe dzirikuratidza hutano. Imwe ihombe dzimwe idiki.", "Three golden, healthy potatoes lie on a white board; one is large and the others are small."),
            ("Mundiro yemuti iyi muzere madora . Madora aya akakangwa zvakanaka akasanganiswa nematamati nehanyanisi.", "This wooden bowl is full of mopane caterpillars (madora), well pan-roasted and mixed with tomatoes and onions."),
            ("Ivhu rakawanda rakaunganidzwa rakatsetseka zvinobva zvaita kuti tifungidzire kuti panzvimbo iyi inzvimbo ine zvicherwa zvinocherwa. Ivhu iri ndiro rinocherwa kubva pasi panenge pachicherwa zvicherwa izvi.", "A large heap of fine soil is piled up, showing that this is a mining site where soil is dug from underground while extracting minerals."),
        ],
    },
    {
        "match": "mushina unoshandiswa kunamirira mitengo",
        "full_english": "A pricing machine is used to stick price labels onto walls and goods for sale. In cities, traffic lights (marobhotsi) keep cars from colliding; they have poles painted white and black with a red light shining at the top while the other lights are off. In a stadium, a goalkeeper in black stands by the goalposts with spectators visible in the distance, alongside a right-foot boot decorated in gold, blue, orange, white, and black.",
        "sentences": [
            ("Mushina unoshandiswa kunamirira mitengo kumadziro uye pazvinhu zviri kutengeswa.", "A machine is used to attach price tags to walls and onto items being sold."),
            ("Marobhotsi anowanikwa mumaguta. Anoita kuti mota dzisabonderane. Marobhotsi aya anedanda rineruvara rwuchena koita danda rineruvara rwutema.", "Traffic lights (robots) are found in cities to prevent cars from colliding, and they have poles painted white and black."),
            ("Nechekumusoro kunoita mwenje kunoratidza kuti kune mwenje mutsvuku mukati. Kumwe kwese kunoratidza kuti mwenje wakadzima.", "At the top shines a red light inside, while the other lights are switched off."),
            ("Vatambi varimunhandare, pane mutambi akamira pagedhi akapfeka zvitema poita vaokeri varikuoneka nechekure. Bhutsu yegumbo rwokurudyi ine mavara akasiyana siyana anosanganisira ruvara rwendarama, rwebhuruu, rweorenji, rwuchena uyewo ruvara rutema.", "Players are in the stadium with a goalkeeper in black standing by the goal and spectators in the distance, alongside a right football boot in gold, blue, orange, white, and black."),
        ],
    },
    {
        "match": "muti mukuru kwazvo une mashizha akasvibira",
        "full_english": "A very large tree has lush green leaves, showing that it receives plenty of water because its leaves are big and abundant, with red soil and a little grass beneath it. Nearby are closed black boots with shiny metal eyelets and laces. In the city centre, people walk in different directions while traffic lights help cars flow smoothly and high-rise buildings rise ahead. Along a tarred road with short brownish grass stand flowering trees with red and pink blossoms and green leaves.",
        "sentences": [
            ("Muti mukuru kwazvo une mashizha akasvibira. Muti uyu unoratidza kuti uri kuwana mvura yakakwana nokuti mashizha awo akakura uye akawanda. Pasi pemuti uyu pane ivhu rakatsvuka huye pane twumasora twushoma.", "A very large tree has lush green leaves, showing it gets enough water because its leaves are big and plentiful, with red soil and a little grass underneath."),
            ("Shangu tema dzakavharika kumberi nekumasure. Dzine rudzi rwejombo uye dzine twusimbi twuri kuonekera nechekure twunopenya penya padivi padzo. Dzine tambo dzokusungisa.", "Black boots closed at the front and back have shiny metal eyelets on the sides and laces for tying."),
            ("Nzvimbo iri pakati peguta. Pane vanhu vari kufamba vachienda kumativi akasiyana. Panewo robhoti rinobatsira kuti mota dzifambe zvakanaka. Nechekumberi kune zvivako zviri kubudira, zvivako izvi zvakavakwa zvichikwira mudenga.", "In the city centre, people walk in different directions while a traffic light helps cars move smoothly and tall buildings rise ahead."),
            ("Nzvimbo iri pedyo nemugwagwa une tara. Ine huswa husina kunyanya kukura. Huswa hwacho hwakaita kutsvukuruka. Panewo miti ine maruva. Maruva acho matsvuku uye mamwe akada kuita pingi. Mashizha emiti iyi ndeegirini.", "Near a tarred road with short brownish grass stand trees with red and pink flowers and green leaves."),
        ],
    },
    {
        "match": "rori huru kwazvo rakamira zvaro",
        "full_english": "A huge truck is parked; it has a handsome white cab, can carry heavy loads, and is stopped at a fuel station. Nearby are left and right blue-and-white shoes with white laces that can be worn by men or women. In the city, people stand beside commuter minibuses (makombi) with a lit multi-storey building ahead. Finally, the stone walls of Great Zimbabwe in Masvingo are shown—a famous heritage site visited by many people to see how ancestors lived long ago.",
        "sentences": [
            ("Rori huru kwazvo rakamira zvaro. Rori iri rine musoro muchena uye rakanaka zvikuru pakutarisa. Rinoratidza kuti rinogona kutakura zvinhu zvakawanda kwazvo uye rori iri riri panzvimbo inoratidza kuti inzvimbo yekuwedzera mafuta.", "A very large truck with a handsome white cab is parked at a refuelling station and can carry a great deal of cargo."),
            ("Shangu dzekurudyi nedzekuruboshwe. Dzine ruvara rwebhuruu neruchena. Dzinoratidza kuti dzakambopfekwa nekuti dzaakukwatanuka. Dzine tambo chena. Shangu idzi dzinogona kupfekwa zvose nevanhurume kana vanhukadzi.", "Left and right shoes in blue and white with white laces show signs of wear and can be worn by both men and women."),
            ("Vanhu vakamira padivi pemotokari dzemarudzi rwemakombi mukati meguta nechekumberi kune imba hombe yemudurikanidzwa yakabaka magetsi mukati mayo.", "People are standing beside commuter minibuses (makombi) inside the city, with a large illuminated multi-storey building ahead."),
            ("Masvingo eGreat Zimbabwe izvi zvinova zvivakwa zvematombo zviri munzvimbo yeMasvingo. Inzvimbo inonyanyawo kushanyirwa nevanhu vachiona mararamiro aiitawo vanhu kare uyewo pane vanhu vari kuratidza kuti vakamira vauya kuzoshanya panzvimbo iyi.", "The Great Zimbabwe monument consists of stone structures in the Masvingo region; it is a popular site visited by people learning how people lived in the past."),
        ],
    },
]


# Beginner-friendly Shona word-by-word glossary for literal_gloss
BEGINNER_WORD_GLOSS: dict[str, tuple[str, str, str]] = {
    "mangwanani": ("ma- (plural) + -ngwanani (morning)", "Greeting / Time Noun", "good morning / morning"),
    "masikati": ("ma- (plural) + -sikati (daytime)", "Greeting / Time Noun", "good afternoon / midday"),
    "manheru": ("ma- (plural) + -nheru (evening)", "Greeting / Time Noun", "good evening / evening"),
    "manhero": ("ma- (plural) + -nhero (evening)", "Time Noun", "in the evening"),
    "mhoro": ("mhoro (hello - singular)", "Greeting", "hello (to one person)"),
    "makadini": ("ma- (you plural/polite) + -kadini (how are)", "Polite Greeting Verb", "how are you all?"),
    "makadii": ("ma- (you polite) + -kadii (how are)", "Polite Greeting Verb", "how are you?"),
    "waswera": ("wa- (you past) + -swera (spend the day)", "Past Greeting Verb", "how did you spend the day?"),
    "makorokoto": ("ma- (plural) + -korokoto", "Exclamation", "congratulations!"),
    "huyai": ("huya (come) + -i (plural/polite command)", "Imperative Verb", "come! (polite/plural)"),
    "uyai": ("uya (come) + -i (plural/polite command)", "Imperative Verb", "come! (polite/plural)"),
    "chiuya": ("chi- (now/then) + -uya (come)", "Immediate Imperative", "come now!"),
    "kuno": ("ku- (locative) + -no (right here)", "Location Word", "here / to this place"),
    "pano": ("pa- (at) + -no (right here)", "Location Word", "right here (at this spot)"),
    "nekukasira": ("ne- (with) + ku- (to) + -kasira (hurry)", "Adverbial Infinitive", "quickly / in a hurry"),
    "nekukurumidza": ("ne- (with) + ku- (to) + -kurumidza (hurry)", "Adverbial Infinitive", "quickly / rapidly"),
    "vhara": ("vhara (close/shut)", "Imperative Verb", "close! / shut!"),
    "musuwo": ("mu- (singular) + -suwo (door)", "Noun (mu-/mi-)", "door / doorway"),
    "tora": ("tora (take/pick up)", "Imperative Verb", "take! / pick up!"),
    "kapu": ("kapu (cup)", "Noun", "cup"),
    "bhuku": ("bhuku (book)", "Noun (ri-/ma-)", "book"),
    "mabhuku": ("ma- (plural) + -bhuku (books)", "Plural Noun (ma-)", "books"),
    "patafura": ("pa- (on) + tafura (table)", "Locative Noun (pa-)", "on the table"),
    "tafura": ("tafura (table)", "Noun", "table"),
    "mumba": ("mu- (inside) + imba (house)", "Locative Noun (mu-)", "in the house / indoors"),
    "kumba": ("ku- (to/at) + imba (home)", "Locative Noun (ku-)", "home / to the house"),
    "kumusha": ("ku- (to/at) + musha (rural home)", "Locative Noun (ku-)", "at/to the rural home"),
    "panze": ("pa- (at) + nze (outside)", "Locative Noun (pa-)", "outside"),
    "kunze": ("ku- (area) + nze (outside)", "Locative Noun (ku-)", "outside / outdoors"),
    "takatenga": ("ta- (we) + -ka- (past) + -tenga (buy)", "Past Tense Verb", "we bought"),
    "hupfu": ("hupfu (maize meal)", "Mass Noun (hu-)", "maize meal (for sadza)"),
    "shuga": ("shuga (sugar)", "Noun", "sugar"),
    "mafuta": ("ma- + -futa (oil/fat)", "Noun (ma-)", "cooking oil / fuel"),
    "nemuriwo": ("ne- (and/with) + muriwo (vegetables)", "Conjunctive Noun", "and leafy vegetables"),
    "muriwo": ("mu- + -riwo (vegetables/relish)", "Noun (mu-/mi-)", "leafy green vegetables"),
    "sadza": ("sadza (thick maize porridge)", "Noun (ri-/ma-)", "sadza (staple maize dish)"),
    "nyama": ("nyama (meat)", "Noun", "meat"),
    "chingwa": ("chi- + -ngwa (bread)", "Noun (chi-/zvi-)", "bread"),
    "munyu": ("mu- + -nyu (salt)", "Noun", "salt"),
    "mukaka": ("mu- + -kaka (milk)", "Noun", "milk"),
    "mvura": ("mvura (water / rain)", "Noun", "water / rain"),
    "tsvuku": ("tsvuku (red)", "Colour Adjective", "red"),
    "rutsvuku": ("ru- + -tsvuku (red)", "Colour Adjective", "red"),
    "nhema": ("nhema (black / dark)", "Colour Adjective", "black"),
    "rutema": ("ru- + -tema (black)", "Colour Adjective", "black"),
    "chena": ("chena (white / clean)", "Colour Adjective", "white"),
    "ruchena": ("ru- + -chena (white)", "Colour Adjective", "white"),
    "girinhi": ("girinhi (green)", "Colour Noun", "green"),
    "ruvara": ("ru- + -vara (colour)", "Noun (ru-/ma-)", "colour"),
    "mavara": ("ma- (plural) + -vara (colours)", "Plural Noun (ma-)", "colours"),
    "mota": ("mota (car)", "Noun", "car"),
    "motokari": ("motokari (motorcar)", "Noun", "car / vehicle"),
    "bhazi": ("bhazi (bus)", "Noun (ri-/ma-)", "bus"),
    "kombi": ("kombi (commuter minibus)", "Noun", "minibus taxi (kombi)"),
    "rori": ("rori (lorry/truck)", "Noun", "truck / lorry"),
    "amai": ("amai (mother)", "Kinship Noun", "mother"),
    "baba": ("baba (father)", "Kinship Noun", "father"),
    "mbuya": ("mbuya (grandmother)", "Kinship Noun", "grandmother"),
    "mwana": ("mu- + -ana (child)", "Noun (mu-/va-)", "child"),
    "vana": ("va- (plural) + -ana (children)", "Plural Noun (va-)", "children"),
    "shamwari": ("shamwari (friend)", "Noun", "friend / friends"),
    "mudzidzisi": ("mu- (person) + -dzidzisi (teacher)", "Noun (mu-/va-)", "teacher"),
    "chikoro": ("chi- + -koro (school)", "Noun (chi-/zvi-)", "school"),
    "kuchikoro": ("ku- (to/at) + chikoro (school)", "Locative Noun (ku-)", "to/at school"),
    "basa": ("basa (work / job)", "Noun (ri-/ma-)", "work / job"),
    "kubasa": ("ku- (to/at) + basa (work)", "Locative Noun (ku-)", "to/at work"),
    "nhasi": ("nhasi (today)", "Time Word", "today"),
    "mangwana": ("mangwana (tomorrow)", "Time Word", "tomorrow"),
    "nezuro": ("nezuro (yesterday)", "Time Word", "yesterday"),
    "zvakanaka": ("zva- + -ka- + -naka (be good)", "Adverb", "well / nicely / very good"),
    "chaizvo": ("chaizvo (very much)", "Intensifier", "very much / truly"),
    "zvikuru": ("zvi- + -kuru (greatly)", "Intensifier", "very much / greatly"),
    "here": ("here (question marker)", "Question Particle", "(yes/no question marker)"),
    "kana": ("kana (if / when / or)", "Conjunction", "if / when / or"),
    "kuti": ("kuti (that / in order to)", "Conjunction", "that / so that"),
    "nokuti": ("nokuti (because)", "Conjunction", "because"),
    "asi": ("asi (but)", "Conjunction", "but / however"),
    "saka": ("saka (so / therefore)", "Conjunction", "so / therefore"),
    "uye": ("uye (and / also)", "Conjunction", "and / furthermore"),
    "rwizi": ("ru- + -izi (river)", "Noun (ru-)", "river"),
    "mhepo": ("mhepo (wind / air)", "Noun", "wind / fresh air"),
    "zuva": ("zuva (sun / day)", "Noun (ri-/ma-)", "sun / day"),
    "makomo": ("ma- (plural) + -komo (mountains)", "Plural Noun (ma-)", "mountains"),
    "miti": ("mi- (plural) + -ti (trees)", "Plural Noun (mi-)", "trees"),
    "muti": ("mu- (singular) + -ti (tree)", "Singular Noun (mu-)", "tree"),
    "mashizha": ("ma- (plural) + -shizha (leaves)", "Plural Noun (ma-)", "leaves"),
    "maruva": ("ma- (plural) + -ruva (flowers)", "Plural Noun (ma-)", "flowers"),
    "shangu": ("shangu (shoes)", "Noun", "shoes"),
    "hembe": ("hembe (shirt / clothes)", "Noun", "shirt / garment"),
    "mbatya": ("mbatya (clothes)", "Plural Noun", "clothes"),
    "vanhu": ("va- (plural) + -nhu (people)", "Plural Noun (va-)", "people"),
    "munhu": ("mu- (singular) + -nhu (person)", "Singular Noun (mu-)", "person"),
    "murume": ("mu- + -rume (man)", "Singular Noun (mu-)", "man"),
    "varume": ("va- + -rume (men)", "Plural Noun (va-)", "men"),
    "mukadzi": ("mu- + -kadzi (woman)", "Singular Noun (mu-)", "woman"),
    "vakadzi": ("va- + -kadzi (women)", "Plural Noun (va-)", "women"),
    "madzimai": ("ma- + -dzimai (women/ladies)", "Polite Plural Noun", "women / ladies"),
}


def generate_textbook_grammar_notes(
    shona_text: str, english_translation: str, lesson_number: int
) -> list[dict[str, str]]:
    """Inspects the exact Shona structures in the lesson text and produces 3 detailed,
    unique, beginner-friendly textbook grammar notes.
    """
    lower = shona_text.lower()
    words = re.findall(r"[A-Za-z']+", shona_text)
    lower_words = [w.lower() for w in words]
    notes: list[dict[str, str]] = []

    # 1. Greetings & Time-of-Day Expressions
    if any(g in lower_words for g in ["mangwanani", "masikati", "manheru", "manhero", "mhoro", "makadini", "waswera"]):
        greet_found = [w for w in words if w.lower() in {"mangwanani", "masikati", "manheru", "manhero", "mhoro", "makadini", "waswera"}][0]
        notes.append({
            "title": f"Shona Greetings & Time of Day ('{greet_found}')",
            "content": (
                f"In this lesson you encounter '{greet_found}'. Shona greetings change depending on the time of day "
                "and how many people you are addressing. 'Mangwanani' is used in the morning, 'Masikati' in the afternoon, "
                "and 'Manheru' in the evening. For a casual 'Hello' to a friend or peer, use 'Mhoro' (or 'Mhoroi' when speaking politely to an elder or group). "
                "To ask 'How are you?', speakers use 'Makadini?' (polite/plural) or ask how your day went with 'Waswera sei?' ('How did you spend the day?')."
            ),
            "rule": "Morning: Mangwanani | Afternoon: Masikati | Evening: Manheru | How are you?: Makadini? / Wakadii?",
        })

    # 2. Congratulations & Exclamations
    if "makorokoto" in lower_words:
        notes.append({
            "title": "Celebrating Milestones with 'Makorokoto!'",
            "content": (
                "The exclamation 'Makorokoto!' means 'Congratulations!'. To specify what you are congratulating someone for, "
                "attach the prefix 'ne-' ('for / with') directly to an infinitive verb starting with 'ku-'. In this sentence, "
                "'nekubudirira' combines 'ne-' (for) + 'kubudirira' (to succeed), literally meaning 'for succeeding'."
            ),
            "rule": "Makorokoto + ne- + ku-[verb] = Congratulations on [doing something]! (e.g., Makorokoto nekubudirira!)",
        })

    # 3. Imperatives: Giving Commands & Polite Requests
    imp_matches = [w for w in words if w.lower() in {"huyai", "uyai", "batai", "vhara", "tora", "svika", "dzoka", "rima", "dzidza", "tsvaga", "vhenekera", "chiuya", "chigara"}]
    if imp_matches:
        imp_word = imp_matches[0]
        is_plural = imp_word.lower().endswith("ai")
        notes.append({
            "title": f"Giving Commands & Polite Requests ('{imp_word}')",
            "content": (
                f"Notice the command verb '{imp_word}' in this sentence. In Shona, a direct command to one person (singular) "
                "is simply the verb stem ending in '-a'—for example, 'Vhara!' ('Close!'), 'Tora!' ('Take!'), or 'Huya!' ('Come!'). "
                "When speaking to more than one person, or when showing polite respect to an adult, you add '-i' to the end, "
                f"changing '-a' to '-ai' (as in 'Huyai!' = 'Come!' or 'Batai!' = 'Catch/Hold!'). Adding the prefix 'chi-' (as in 'Chiuya' or 'Chigara') means 'Do it right now'."
            ),
            "rule": "Singular Command: Verb stem (-a) [Huya! / Tora!] | Polite or Plural Command: Verb stem + -i (-ai) [Huyai! / Torai!]",
        })

    # 4. Past Tense (-ka- and Recent Past -a-)
    past_matches = [w for w in words if re.match(r"^(nda|wa|a|ta|ma|va|ya|ra|cha|zva|dza)ka[a-z]{2,}", w.lower())]
    recent_past = [w for w in words if w.lower() in {"ndamuka", "wabudirira", "ndaisa", "chapera", "ndapedza", "ndawana", "ndasiya", "watanga", "ndafara", "yanaya", "ranonoka", "yafa"}]
    if past_matches or recent_past:
        p_word = (past_matches + recent_past)[0]
        notes.append({
            "title": f"Talking About the Past ('{p_word}')",
            "content": (
                f"The verb '{p_word}' expresses a completed past action. Shona has two main ways to talk about the past: "
                "1) For actions that happened earlier today or very recently, combine the short subject prefix ('nda-' = I, 'wa-' = you, 'a-' = he/she, 'ta-' = we, 'va-' = they) "
                "directly with the verb stem (e.g., 'ndamuka' = 'I woke up today', 'wabudirira' = 'you have succeeded'). "
                "2) For events that happened yesterday or further in the past, insert '-ka-' after the subject prefix (e.g., 'takatenga' = 'we bought', 'vakaenda' = 'they went', 'akadanidzira' = 'he shouted')."
            ),
            "rule": "Recent Today Past: [nda- / wa- / ta- / va-] + verb | Earlier Past: [ndaka- / waka- / taka- / vaka-] + verb",
        })

    # 5. Present Progressive (-ri ku-) — Actions Happening Right Now
    prog_matches = re.findall(r"\b(ndiri|uri|ari|tiri|muri|vari|iri|riri|chiri|zviri|rwuri|kuri|pari)\s+ku[a-z]+|\b(ndiriku|uriku|ariku|tiriku|variku|iriku|ririku|chiriku|zviriku)[a-z]+", lower)
    if prog_matches or any(w in lower for w in ["ndirikugadzirira", "ari kuchema", "iri kunaya", "tiri kuronga", "vari kurwara", "ndiri kutsvaga", "iri kuhukura"]):
        notes.append({
            "title": "Actions Happening Right Now: The '-ri ku-' Progressive",
            "content": (
                "To describe an action that is happening right now ('I am doing', 'it is raining', 'they are walking'), Shona uses the helper verb '-ri' ('am/is/are') "
                "followed by 'ku-' ('to') and the action verb. For people, the forms are 'ndiri ku-' (I am), 'uri ku-' (you are), 'ari ku-' (he/she is), "
                "'tiri ku-' (we are), and 'vari ku-' (they are). In fast speech or writing, the two words are sometimes joined together (e.g., 'ndiri kuenda' or 'ndirikuenda')."
            ),
            "rule": "[Subject + -ri] + ku-[verb] -> Ndiri kuverenga (I am reading) | Vari kufamba (They are walking) | Mvura iri kunaya (It is raining)",
        })

    # 6. Present Habitual & General Statements (-no-)
    hab_matches = [w for w in words if re.match(r"^(ndi|u|a|ti|mu|va|i|ri|chi|zvi|ru|ku)no[a-z]{2,}", w.lower())]
    if hab_matches and len(notes) < 3:
        h_word = hab_matches[0]
        notes.append({
            "title": f"Present Tense & Everyday Actions ('{h_word}')",
            "content": (
                f"The verb '{h_word}' uses the present marker '-no-'. In Shona, inserting '-no-' between the subject prefix and the verb stem "
                "expresses general truths, everyday habits, or states of mind like 'wanting', 'thinking', and 'knowing'. "
                "For example: 'ndinoda' ('I want/like'), 'unofunga' ('you think'), 'vanoti' ('they say'), and 'vanorima' ('they farm')."
            ),
            "rule": "[ndi- (I) / u- (you) / a- (he/she) / ti- (we) / va- (they)] + -no- + verb -> Ndinoda (I want), Vanogara (They live)",
        })

    # 7. Future Tense (-cha-)
    fut_matches = [w for w in words if re.match(r"^(ndi|u|a|ti|mu|va|i|ri|chi|zvi|ku)cha[a-z]{2,}", w.lower())]
    if fut_matches and len(notes) < 3:
        f_word = fut_matches[0]
        notes.append({
            "title": f"Talking About the Future with '-cha-' ('{f_word}')",
            "content": (
                f"Look at '{f_word}' in this sentence. Whenever you want to say what 'will' happen in the future, simply place the future marker '-cha-' "
                "between the subject prefix and the verb stem. For example, 'ndichabika' means 'I will cook', 'tichasvika' means 'we will arrive', "
                "and 'mvura ichanaya' means 'the rain will fall'. Pair it with 'mangwana' ('tomorrow') to talk about tomorrow's plans!"
            ),
            "rule": "Subject Prefix + -cha- + Verb Stem = Future ('will') -> Ndichaenda (I will go), Vachadzoka (They will return)",
        })

    # 8. Colours & Describing Appearance
    colour_matches = [w for w in words if any(c in w.lower() for c in ["tsvuku", "nhema", "tema", "chena", "girinhi", "girini", "bhuruu", "bhurauni", "orenji", "ruvara", "mavara", "goridhe", "pingi"])]
    if colour_matches and len(notes) < 3:
        c_word = colour_matches[0]
        notes.append({
            "title": f"Colours & Describing Objects in Shona ('{c_word}')",
            "content": (
                f"This passage uses colour vocabulary such as '{c_word}'. Shona has three traditional core colour adjectives that change their prefix slightly to match the noun they describe: "
                "'-chena' (white/clean, e.g., 'ruvara ruchena' or 'shangu chena'), '-tema / nhema' (black/dark, e.g., 'mota nhema' or 'ruvara rutema'), and "
                "'-tsvuku' (red/bright brown, e.g., 'mota tsvuku' or 'ruvara rutsvuku'). For other colours like green ('girinhi'), blue ('bhuruu'), or orange ('orenji'), "
                "speakers typically say 'ruvara rwe-' ('the colour of...') followed by the colour name, as in 'ruvara rwegirinhi' (green)."
            ),
            "rule": "Core Colours: -chena (white), -tema / nhema (black), -tsvuku (red) | Phrase pattern: ruvara rwe-[colour] (e.g., ruvara rwegirinhi)",
        })

    # 9. Numbers & Counting Items
    num_matches = [w for w in words if w.lower() in {"chimwe", "mumwe", "imwe", "imwechete", "mumwechete", "maviri", "vaviri", "mbiri", "mitatu", "matatu", "rutatu", "nhatu", "zvitatatu", "mana", "vana", "ina", "mashanu"}]
    if num_matches and len(notes) < 3:
        n_word = num_matches[0]
        notes.append({
            "title": f"Counting & Numbers in Shona ('{n_word}')",
            "content": (
                f"In Shona, number words like '{n_word}' always come AFTER the noun they count, and their starting prefix matches the noun's group! "
                "The basic number stems are: '-mwe' (1), '-viri' (2), '-tatu' (3), '-na' (4), and '-shanu' (5). "
                "For example, when counting people ('vanhu'), you use 'va-': 'munhu mumwe' (1 person), 'vanhu vaviri' (2 people), 'varume vana' (4 men). "
                "When counting 'ma-' plurals like 'maminitsi' (minutes) or 'mavara' (colours), you use 'ma-': 'madhongi maviri' (2 donkeys), 'mavara matatu' (3 colours), 'maminitsi mashanu' (5 minutes)."
            ),
            "rule": "Noun + Number Stem (-mwe = 1, -viri = 2, -tatu = 3, -na = 4, -shanu = 5) -> vanhu vaviri (2 people), maminitsi mashanu (5 minutes)",
        })

    # 10. Locatives: Saying 'On', 'At/To', and 'Inside' (pa-, ku-, mu-)
    loc_matches = [w for w in words if re.match(r"^(pa|ku|mu)(tafura|mba|musha|chikoro|basa|musika|nze|harare|dhorobha|guta|mugwagwa|rutivi|musoro|kati|asi|nyika|nhandare)", w.lower()) or w.lower() in {"pasi", "pamusoro", "padivi", "pedyo", "pakati"}]
    if loc_matches and len(notes) < 3:
        l_word = loc_matches[0]
        notes.append({
            "title": f"Talking About Location: 'pa-', 'ku-', and 'mu-' ('{l_word}')",
            "content": (
                f"Look at how location is expressed with '{l_word}'. Instead of separate prepositions like 'on', 'to', or 'in', Shona attaches one of three location prefixes directly to the front of a noun:\n"
                "• 'pa-' means 'at' or 'on' a specific point or surface (e.g., 'patafura' = on the table, 'pamusika' = at the market, 'pasi' = on the ground).\n"
                "• 'ku-' means 'to', 'from', or 'at' a general destination (e.g., 'kuchikoro' = to school, 'kumusha' = to the rural home, 'kubasa' = at/to work).\n"
                "• 'mu-' means 'inside' an enclosed space (e.g., 'mumba' = inside the house, 'muguta' = in the city, 'mumugwagwa' = in the road)."
            ),
            "rule": "pa- = on / at a point (patafura) | ku- = to / at a place (kuchikoro) | mu- = inside (mumba)",
        })

    # 11. Questions ('here', 'sei', 'ndeipi')
    if any(q in lower_words for q in ["here", "sei", "ndeipi", "chii"]) and len(notes) < 3:
        notes.append({
            "title": "Asking Questions in Shona ('here', 'sei', 'ndeipi')",
            "content": (
                "Forming a yes/no question in Shona is remarkably easy: keep the normal statement word order and simply add the question word 'here' at the very end of the sentence! "
                "For example, 'Mvura ichanaya mangwana' ('It will rain tomorrow') becomes 'Mvura ichanaya here mangwana?' ('Will it rain tomorrow?'). "
                "For open questions, use 'sei?' ('how / why?', as in 'Wakafamba sei?' = 'How did you travel?') or 'ndeipi?' ('which one?', as in 'Ndeipi mota?' = 'Which car?')."
            ),
            "rule": "Statement + here? = Yes/No Question | Verb + sei? = How? | Ndeipi + Noun? = Which [noun]?",
        })

    # 12. Expressing Purpose & Wishes with 'kuti' (+ Subjunctive '-e')
    if "kuti" in lower_words and len(notes) < 3:
        notes.append({
            "title": "Connecting Clauses & Expressing Purpose with 'kuti'",
            "content": (
                "The connector 'kuti' is one of the most useful words in Shona. After verbs of speaking, thinking, or knowing (like 'akati' = said, 'unofunga' = you think, 'ndinoziva' = I know), "
                "'kuti' means 'that'. However, when placed after an action verb, 'kuti' means 'so that / in order to', and the following verb changes its final vowel from '-a' to '-e'! "
                "For instance, '-dya' (eat) becomes 'kuti tidye' ('so that we may eat'), and '-wana' (get) becomes 'kuti uwane' ('so that you may get')."
            ),
            "rule": "kuti + [Subject Prefix + Verb ending in -e] = 'so that [someone] may...' (e.g., kuti tidye = so that we eat)",
        })

    # 13. Conditionals & Time Clauses ('kana' = if/when, 'usati / tisati' = before)
    if any(c in lower_words for c in ["kana", "usati", "tisati", "ndisati", "kunyangwe"]) and len(notes) < 3:
        notes.append({
            "title": "Saying 'If', 'When', and 'Before' ('kana' & '-sati')",
            "content": (
                "To link two events in time or condition, Shona uses 'kana' ('if / when'). When talking about a future condition ('If we work hard...'), "
                "the verb after 'kana' takes '-ka-' (e.g., 'kana tikashanda' = 'if we work'). When 'kana' sits between two nouns (like 'tsvuku kana nhema'), it simply means 'or'! "
                "To say 'before' something happens, Shona uses '-sati' ('not yet') followed by a past-form verb: 'usati wabuda' ('before you go out') or 'tisati tadya' ('before we eat')."
            ),
            "rule": "kana = if / when / or | [ndisati / usati / tisati] + past verb = before [I / you / we] do something",
        })

    # 14. Possessives: Saying 'My', 'Your', 'His/Her', and 'Our'
    poss_matches = [w for w in words if re.search(r"(angu|ako|ake|edu|enyu|avo)$", w.lower()) and len(w) >= 4]
    if poss_matches and len(notes) < 3:
        p_word = poss_matches[0]
        notes.append({
            "title": f"Possessive Pronouns: Saying 'My', 'Your', and 'Our' ('{p_word}')",
            "content": (
                f"In Shona, possessive words like '{p_word}' ('my/your/our/their') always follow the noun they belong to! "
                "The six core possessive stems are '-ngu' (my), '-ko' (your), '-ke' (his/her/its), '-du' (our), '-nyu' (your plural/polite), and '-vo' (their). "
                "A short linking sound ('wa-', 'ya-', 'ra-', 'cha-', 'dza-', 'ma-') attaches to the front of the stem to match the noun: "
                "for example, 'shamwari yangu' (my friend), 'munda wako' (your field), 'mabhuku edu' (our books), and 'kubudirira kwenyu' (your success)."
            ),
            "rule": "Noun + [Linking Prefix + -ngu (my) / -ko (your) / -ke (his/her) / -du (our) / -nyu (your polite) / -vo (their)]",
        })

    # 15. Connecting Words with 'na- / ne-' ('and / with / by')
    ne_matches = [w for w in words if re.match(r"^ne[a-z]{3,}", w.lower()) and w.lower() not in {"nezuro"}]
    if ne_matches and len(notes) < 3:
        ne_w = ne_matches[0]
        notes.append({
            "title": f"Joining Words with 'ne-' ('and / with') in '{ne_w}'",
            "content": (
                f"Look closely at '{ne_w}'. In Shona, the word for 'and' or 'with' between nouns is not a separate word—instead, the prefix 'ne-' (or 'na-' before people's names) "
                f"is written attached directly to the second noun! For example, 'ne-' + '{ne_w[2:]}' forms '{ne_w}'. "
                "You will see this everywhere in daily speech: 'sadza nemuriwo' ('sadza and vegetables'), 'nesimba' ('with strength'), and 'nekukasira' ('with haste / quickly')."
            ),
            "rule": "ne- + Noun = and / with [Noun] (written as a single word, e.g., sadza nemuriwo = sadza and vegetables)",
        })

    # 16. Saying 'There is / Have' ('pane', 'kune', 'mune', 'ine', 'ane')
    if any(ex in lower_words for ex in ["pane", "kune", "mune", "ine", "ane", "tine", "une", "rine", "chine", "dzine"]) and len(notes) < 3:
        notes.append({
            "title": "Expressing 'Has/Have' and 'There Is/Are' ('-ne' & 'pane / kune')",
            "content": (
                "Shona does not use a separate verb like 'have'; instead, it combines a subject prefix with '-ne' ('with'). "
                "For people: 'ndine' (I have), 'une' (you have), 'ane' (he/she has), 'tine' (we have), 'vane' (they have). "
                "For things, the prefix matches the object: 'imba ine...' ('the house has...'), 'rori rine...' ('the truck has...'). "
                "When combined with the location prefixes 'pa-', 'ku-', and 'mu-', it means 'there is / there are': "
                "'pane' ('there is right here'), 'kune' ('there is in that area'), and 'mune' ('there is inside')."
            ),
            "rule": "Person/Thing + -ne = has/have (tine = we have, ine = it has) | pane / kune / mune = there is / there are",
        })

    # Fill any remaining slot up to 3 notes with relevant sentence-building insights
    if len(notes) < 3:
        notes.append({
            "title": "How Shona Sentences Fit Together (Subject + Tense + Verb)",
            "content": (
                f"In '{shona_text[:70]}{'...' if len(shona_text) > 70 else ''}', notice how a single Shona verb word packs together "
                "who is doing the action (the subject prefix), when it happens (the tense marker), and the action itself (the verb stem). "
                "Once you recognize the building blocks at the start of the verb—like 'ndi-' (I), 'u-' (you), 'ti-' (we), or 'va-' (they)—you can immediately "
                "spot the subject even when no separate pronoun word is used!"
            ),
            "rule": "[Who (Subject Prefix)] + [When (Tense Marker)] + [Action (Verb Root)] -> e.g., ti- (we) + -cha- (will) + -svika (arrive) = tichasvika",
        })

    if len(notes) < 3:
        notes.append({
            "title": "Describing Nouns: Word Order in Shona",
            "content": (
                "In English, descriptive words like adjectives, possessives ('my', 'our'), demonstratives ('this', 'that'), and numbers come BEFORE the noun "
                "('this big house', 'my two books'). In Shona, the noun always comes FIRST, and all descriptive words follow right after it! "
                "For example: 'nyama iyi' ('this meat'), 'mwana uyu' ('this child'), 'goho guru' ('a big harvest'), and 'makomo marefu' ('tall mountains')."
            ),
            "rule": "Noun FIRST + Descriptor SECOND -> mota iyi (this car), mabhuku edu (our books), makomo marefu (tall mountains)",
        })

    return notes[:3]


def generate_textbook_cultural_notes(
    shona_text: str, english_translation: str, lesson_number: int
) -> list[dict[str, str]]:
    """Generates rich, topic-specific cultural notes directly related to the lesson's conversation or scene."""
    lower = shona_text.lower()
    words = set(re.findall(r"[a-z']+", lower))

    if words & {"mangwanani", "masikati", "manheru", "mhoro", "makadini", "waswera"}:
        return [{
            "title": "The Art of Greeting in Shona Culture",
            "content": (
                "In Zimbabwe, greetings are never rushed—they are the foundation of every social interaction. Before asking a question, "
                "entering a room, or starting business, people always exchange time-of-day greetings ('Mangwanani', 'Masikati', or 'Manheru') "
                "and ask after the wellbeing of the other person's household ('Makadini mose muri mumba?'). Even when speaking to a single adult, "
                "using the plural form ('ma-') is a sign of warmth and mutual respect known as 'hunhu' (ubuntu)."
            ),
        }]

    if "makorokoto" in words:
        return [{
            "title": "Celebrating Shared Success ('Makorokoto!')",
            "content": (
                "Whenever someone passes an exam, starts a new job, welcomes a child, or achieves a goal, friends, neighbours, and family gather "
                "to say 'Makorokoto!' ('Congratulations!'). Success in Shona culture is celebrated as a shared achievement for the whole family and community, "
                "often accompanied by handshakes, ululation ('kupururudza'), and words of encouragement."
            ),
        }]

    if words & {"chara", "inda", "vakuru", "zvirevo", "ngano"}:
        return [{
            "title": "Wisdom of the Elders: Shona Proverbs ('Tsumo')",
            "content": (
                "Proverbs ('tsumo') are prized in Shona conversation as a way to pass down practical wisdom from elders ('vakuru'). "
                "The famous proverb 'Chara chimwe hachitswanyi inda' ('One finger cannot crush a louse') teaches that no single person can solve "
                "life's challenges alone—just as you need two thumbnails working together, people must cooperate and support one another in family and community life."
            ),
        }]

    if words & {"sadza", "hupfu", "muriwo", "nemuriwo", "neusavi", "nyama", "madora", "mbatatisi", "nyemba", "nzungu"}:
        return [{
            "title": "Zimbabwean Cuisine: Sadza, Relish & Traditional Foods",
            "content": (
                "At the heart of Zimbabwean home cooking is 'sadza'—a thick, smooth porridge made from white maize meal ('hupfu') cooked with water. "
                "Sadza is always served with a savoury accompaniment called 'usavi' (relish), most commonly leafy green vegetables ('muriwo') sautéed with "
                "tomatoes, onions, and cooking oil ('mafuta'), or meat ('nyama'). Beloved traditional delicacies also include roasted groundnuts ('nzungu'), "
                "cowpeas ('nyemba'), and protein-rich mopane caterpillars ('madora') pan-roasted with tomatoes and onions."
            ),
        }]

    if words & {"chingwa", "kapu", "shuga", "mukaka", "munyu"}:
        return [{
            "title": "Morning Tea, Bread & Hospitality at Home",
            "content": (
                "Breakfast in many Zimbabwean households centres around hot tea with milk ('mukaka') and sugar ('shuga') served alongside fresh bread ('chingwa') "
                "or home-grown sweet potatoes and groundnut butter. When a visitor arrives at any time of day, offering a cup ('kapu') of tea or cool drinking water ('mvura') "
                "at the table ('patafura') is an essential expression of household hospitality."
            ),
        }]

    if words & {"kumusha", "mbuya", "sekuru", "nhoroondo", "masvingo", "munhumutapa", "great"}:
        return [{
            "title": "Ancestral Roots ('Kumusha') & Great Zimbabwe Heritage",
            "content": (
                "Even for families who live and work in cities like Harare, the rural family homestead ('kumusha')—where grandparents ('mbuya' and 'sekuru') often live—"
                "remains the spiritual and cultural heart of the family. Travelling 'kumusha' during holidays strengthens family bonds. "
                "On a national scale, the dry-stone walls of Great Zimbabwe ('Masvingo eGreat Zimbabwe'), built centuries ago without mortar, gave modern Zimbabwe its name ('Dzimba dzemabwe' — Houses of Stone)."
            ),
        }]

    if words & {"mvura", "munda", "kumunda", "goho", "gohwo", "rima", "vanorima", "badza", "turusi", "maturusi", "mafoshoro", "mahara"}:
        return [{
            "title": "Farming ('Kurima'), Rain & the Harvest Season",
            "content": (
                "Agriculture plays a central role in Zimbabwean life, and the arrival of the rains ('mvura') around November marks the beginning of the planting season ('zhizha'). "
                "Families cultivate their fields ('munda') using hand hoes ('badza'), rakes ('mahara'), and shovels ('mafoshoro') to grow maize, groundnuts, and vegetables. "
                "A plentiful rainfall brings hope for a bountiful harvest ('goho guru'), which is a frequent topic of friendly daily conversation."
            ),
        }]

    if words & {"pamusika", "kumusika", "musika", "kutengesa", "varikutengesa", "muchitoro", "kuchitoro", "matakishopu", "michero", "chinanasi"}:
        return [{
            "title": "Bustling Open-Air Markets ('Musika') & Neighbourhood Shops",
            "content": (
                "Open-air markets ('pamusika') are vibrant community hubs across Zimbabwean towns and suburbs. Vendors sit beneath colourful umbrellas ('amburera') "
                "selling fresh fruits ('michero') like pineapples ('chinanasi'), bananas, tomatoes, and potatoes alongside clothing and household goods. "
                "For quick daily essentials close to home, residents also visit neighbourhood grocery stores ('zvitoro') and small corner tuckshops ('matakishopu')."
            ),
        }]

    if words & {"bhazi", "kombi", "makombi", "mota", "motokari", "rori", "gonyeti", "madhongi", "ngoro", "marobhotsi", "robhoti", "mugwagwa"}:
        return [{
            "title": "Getting Around: Kombis, Buses, Rural Carts & 'Robots'",
            "content": (
                "Daily transport in Zimbabwe features unique local vocabulary! In towns and cities, most commuters travel by white commuter minibuses universally called 'makombi' (singular: 'kombi'), "
                "while long-distance intercity trips use large buses ('bhazi') and heavy haulage trucks are affectionately nicknamed 'magonyeti'. "
                "In rural areas, donkey-drawn carts ('ngoro yemadhongi') are widely used to carry goods. And if someone tells you to turn at the 'robhoti' (plural: 'marobhotsi'), "
                "they don't mean a machine person—in Zimbabwe and Southern Africa, traffic lights are called 'robots'!"
            ),
        }]

    if words & {"chikoro", "kuchikoro", "mudzidzisi", "bvunzo", "mabhuku", "penzura", "kirasi"}:
        return [{
            "title": "Education, School Life & Respect for Teachers",
            "content": (
                "Education ('dzidzo') is deeply valued by Zimbabwean families, who invest great pride in seeing children study hard ('kudzidza nesimba') "
                "and pass their school examinations ('kupasa bvunzo'). Teachers ('vadzidzisi', singular: 'mudzidzisi') are addressed with high respect in the community, "
                "and schoolmates ('shamwari dzepachikoro') often form lifelong friendships."
            ),
        }]

    if words & {"jojo", "migomo", "zvigubu", "kucherera"}:
        return [{
            "title": "Water Conservation & Community Water Collection",
            "content": (
                "Across urban and peri-urban neighbourhoods in Zimbabwe, households commonly install large green or tan plastic water storage tanks—universally known as 'Jojo tanks'—"
                "mounted on elevated brick or steel stands beside the house to store borehole or rainwater. At community water points, neighbours gather with buckets ('migomo') "
                "and containers ('zvigubu'), turning water collection into a lively time for catching up with neighbours."
            ),
        }]

    if words & {"zvipembere", "shiri", "imbwa", "makomo", "rwizi", "mhepo", "zuva"}:
        return [{
            "title": "Zimbabwe's Natural Landscape & Wildlife",
            "content": (
                "Zimbabwe is renowned for its dramatic landscapes—from the eastern highlands and balancing granite hills ('makomo') to great rivers ('rwizi') like the Zambezi "
                "and rich wildlife parks home to rhinoceroses ('zvipembere'), elephants ('nzou'), and diverse birdlife ('shiri'). In both rural and suburban homes, "
                "dogs ('imbwa') are kept as loyal watchdogs that alert the household at night."
            ),
        }]

    if words & {"yokutandarira", "chigaro", "zvigaro", "tebhuro", "firiji", "makabati", "kicheni", "patafura", "tafura"}:
        return [{
            "title": "The Zimbabwean Home: Living Room ('Imba Yokutandarira') & Kitchen",
            "content": (
                "In Zimbabwean homes, the living room is called 'imba yokutandarira'—literally 'the room for spending social time and chatting together' (from 'kutandara', to socialize). "
                "Welcoming guests into a neat, well-arranged sitting room with comfortable chairs ('zvigaro') and a central table ('tafura' or 'tebhuro'), or into a bright kitchen "
                "with modern cupboards ('makabati') and a refrigerator ('firiji'), is a point of household pride."
            ),
        }]

    if words & {"hembe", "shangu", "bvudzi", "mhete", "ngowani", "mbatya", "kupfeka", "akapfeka", "vakapfeka"}:
        return [{
            "title": "Dress, Grooming & Personal Presentation in Zimbabwe",
            "content": (
                "Neat personal presentation ('kuchena') is highly valued in everyday Zimbabwean life—whether dressing for work, church, school, or visiting family. "
                "Notice how 'hembe' refers broadly to a shirt or top, 'mbatya' (or 'nhumbi') means clothes in general, and 'shangu' means shoes. "
                "Braided hairstyles ('bvudzi rakarukwa'), earrings ('mhete'), and sun hats ('ngowani') are also everyday topics of compliment and description."
            ),
        }]

    if words & {"maruva", "gaba", "mashizha", "miti", "muti", "uswa", "huswa"}:
        return [{
            "title": "Gardens, Trees & Appreciation of Nature Around the Home",
            "content": (
                "Both urban and rural households in Zimbabwe take great care of the yard ('chivanze') surrounding the home—planting shade and fruit trees ('miti'), "
                "tending flower beds, and placing cut flowers ('maruva') in vases ('magaba emaruva') indoors. Shade trees around the yard also serve as cool gathering spots "
                "where family members sit and converse during warm afternoons."
            ),
        }]

    if words & {"mureza", "nyika"}:
        return [{
            "title": "National Symbols & Colours of Zimbabwe ('Mureza weZimbabwe')",
            "content": (
                "Every colour on the national flag of Zimbabwe ('mureza weZimbabwe') carries historical and natural meaning taught in schools across the country: "
                "green ('girinhi') represents the land's agriculture and vegetation, yellow ('yero') stands for mineral wealth, red ('tsvuku') honours the blood shed during the liberation struggle, "
                "black ('tema') represents the heritage of the majority people, and the white ('chena') triangle symbolizes peace."
            ),
        }]

    if words & {"musuwo", "hwindo", "undibatsire", "kusimudza", "zevezera", "akarara", "zorora", "ndimbozorora", "makiyi"}:
        return [{
            "title": "Household Cooperation, Politeness & Consideration at Home",
            "content": (
                "Daily home life in Shona culture revolves around mutual assistance ('kubatsirana') and consideration for others in the household. "
                "When asking a family member to help lift something heavy ('undibatsire kusimudza'), open or close a door ('musuwo') or window ('hwindo'), "
                "or speak softly ('kuzevezera') while a child is sleeping ('mwana akarara'), polite phrasing keeps household life warm and harmonious."
            ),
        }]

    return [{
        "title": "Everyday Communication, Politeness & Community Life",
        "content": (
            f"In everyday Shona conversation (as in '{english_translation[:80]}{'...' if len(english_translation) > 80 else ''}'), "
            "speakers place a strong emphasis on politeness, patience, and consideration for others around them—whether asking for help ('ndinokumbirawo undibatsire'), "
            "speaking quietly when someone is resting or studying, or sharing news with family at the end of the day."
        ),
    }]



def _rotate_options(correct: str, distractors: list[str], seed: int) -> list[str]:
    """Deterministically places `correct` at index `seed % 4` among 3 distinct distractors."""
    clean_distractors = [d for d in distractors if d.strip().lower() != correct.strip().lower()]
    while len(clean_distractors) < 3:
        clean_distractors.append(f"Option {len(clean_distractors) + 1}")
    chosen = clean_distractors[:3]
    target_idx = seed % 4
    chosen.insert(target_idx, correct)
    return chosen[:4]


# Pool of thematic new-sentence drills categorized by grammar/topic tag so every lesson gets
# 3 unique, contextual exercises on BRAND-NEW sentences (never repeating the lesson text!).
THEMATIC_NEW_EXERCISES: list[dict[str, object]] = [
    # 0. Imperatives & Polite Requests
    {
        "tags": {"huyai", "uyai", "chiuya", "vhara", "tora", "chigara", "svika", "dzoka", "ndapota", "batai"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "You want to politely ask an elder or a group of guests to sit down ('gara'). Which imperative form should you use?",
                "correct": "Garai pasi, ndapota.",
                "distractors": ["Gara pasi, ndapota.", "Vanogara pasi.", "Takagara pasi."],
                "explanation": "Adding '-i' to the verb stem ('gara' -> 'garai') forms the plural and polite command in Shona.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How would you say 'Open the door quickly!' in Shona using the vocabulary pattern from this unit?",
                "correct": "Vhura musuwo nekukasira!",
                "distractors": ["Vhara hwindo zvishoma!", "Musuwo uri kuvhurwa mangwana.", "Ndakavhara musuwo nezuro."],
                "explanation": "'Vhura' means 'open!', 'musuwo' is 'door', and 'nekukasira' (or 'nekukurumidza') means 'quickly'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Tora mvura uinwe.'",
                "correct": "Take the water and drink it.",
                "distractors": [
                    "Put the cup on the table before you leave.",
                    "Close the window because it is cold outside.",
                    "Come here and help me carry the books.",
                ],
                "explanation": "'Tora' = 'Take', 'mvura' = 'water', and 'uinwe' = 'and drink it'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you politely ask someone to speak softly ('taura zvinyoronyoro')?",
                "correct": "Ndapota taurai zvinyoronyoro.",
                "distractors": ["Taurai zvinonzwika kwazvo!", " Vhara musuwo nekukasira.", "Rega kutaura neshamwari yako."],
                "explanation": "'Ndapota' = 'Please', 'taurai' = polite plural imperative of 'taura' (speak), 'zvinyoronyoro' = 'softly / gently'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "In 'Uya kuno undibatsire', what does the prefix '-ndi-' inside 'undibatsire' mean?",
                "correct": "'me' (so 'undibatsire' means 'and help me')",
                "distractors": ["'them' (and help them)", "'us' (and help us)", "'him' (and help him)"],
                "explanation": "The object prefix '-ndi-' always means 'me', placed directly before the verb stem '-batsira' (help).",
            },
            {
                "type": "translate",
                "prompt": "Translate this new polite request into English: 'Chimbomirira zvishoma pamusuwo.'",
                "correct": "Please wait a little while at the door.",
                "distractors": [
                    "Come inside the house and sit on the chair.",
                    "Return home early before the sun sets.",
                    "Take your books and put them in the bag.",
                ],
                "explanation": "'Chimbomirira' = 'Wait a little / for a moment right now', 'zvishoma' = 'a little', 'pamusuwo' = 'at the door'.",
            },
        ],
    },
    # 1. Greetings & Daily Check-ins
    {
        "tags": {"mangwanani", "mhoro", "manheru", "makadini", "waswera", "makorokoto"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "You meet your neighbour at 7:00 PM in the evening. Which greeting is appropriate?",
                "correct": "Manheru, makadini henyu?",
                "distractors": ["Mangwanani, warara sei?", "Masikati, waswera sei?", "Mhoro, ndiri kuenda kuchikoro."],
                "explanation": "'Manheru' is the greeting used in the evening, paired with 'makadini henyu?' ('how are you?').",
            },
            {
                "type": "multiple_choice",
                "prompt": "Your friend just passed her driving test! What do you say to congratulate her in Shona?",
                "correct": "Makorokoto nekubudirira kwako!",
                "distractors": ["Ndine urombo nebasa rako!", "Famba zvakanaka munzira!", "Ndapota vhura musuwo!"],
                "explanation": "'Makorokoto!' means 'Congratulations!' and 'nekubudirira kwako' means 'on your success'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new morning exchange into English: 'Mangwanani baba, mamuka sei?'",
                "correct": "Good morning Father, how did you wake up?",
                "distractors": [
                    "Good evening Mother, how was your day?",
                    "Hello my friend, where are you going today?",
                    "Congratulations on finishing your studies!",
                ],
                "explanation": "'Mangwanani' = 'Good morning', 'baba' = 'Father', and 'mamuka sei?' = 'how did you wake up?'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "If a friend asks you in the afternoon 'Waswera sei?', what is the natural reply?",
                "correct": "Ndaswera kana waswerawo.",
                "distractors": ["Ndamuka kana wamukawo.", "Mangwanani akanaka.", "Ndakabika sadza nezuro."],
                "explanation": "In Shona, you reply to 'Waswera sei?' ('How did you spend the day?') with 'Ndaswera kana waswerawo' ('I spent the day well if you spent it well too').",
            },
            {
                "type": "multiple_choice",
                "prompt": "What is the difference between 'Mhoro' and 'Mhoroi'?",
                "correct": "'Mhoro' is for one peer/child, while 'Mhoroi' is for an elder or a group of people",
                "distractors": [
                    "'Mhoro' is used only at night, while 'Mhoroi' is used in the morning",
                    "'Mhoro' means goodbye, while 'Mhoroi' means welcome",
                    "'Mhoro' is used in shops, while 'Mhoroi' is used only at school",
                ],
                "explanation": "Adding '-i' ('Mhoro' -> 'Mhoroi') shows plural or respectful address.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new greeting into English: 'Masikati amai, maswera zvakanaka here?'",
                "correct": "Good afternoon Mother, did you spend the day well?",
                "distractors": [
                    "Good morning Grandmother, did you sleep well?",
                    "Good evening everyone inside the house.",
                    "Thank you very much for helping us today.",
                ],
                "explanation": "'Masikati amai' = 'Good afternoon Mother', 'maswera zvakanaka here?' = 'have you spent the day well?'.",
            },
        ],
    },
    # 2. Food, Cooking & Past/Future Tenses
    {
        "tags": {"takatenga", "hupfu", "shuga", "mafuta", "nemuriwo", "muriwo", "sadza", "neusavi", "nyama", "chingwa", "munyu", "mukaka", "nzara"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "Complete this new sentence in the past tense: 'Nezuro amai ______ sadza nenyama.' (Yesterday Mother cooked sadza and meat.)",
                "correct": "vakabika",
                "distractors": ["vanozobika", "vari kubika", "ndichabika"],
                "explanation": "'Amai' takes the respectful plural past prefix 'vaka-' + '-bika' (cook) -> 'vakabika' ('cooked').",
            },
            {
                "type": "multiple_choice",
                "prompt": "If someone says 'Ndinonzwa nyota, ndinoda kunwa mukaka kana mvura', what are they asking for?",
                "correct": "Milk or water because they feel thirsty",
                "distractors": [
                    "Bread and sugar because it is morning",
                    "Maize meal and cooking oil from the market",
                    "Salt and vegetables for the evening meal",
                ],
                "explanation": "'Mukaka' means 'milk', 'kana' means 'or', and 'mvura' means 'water'.",
            },
            {
                "type": "translate",
                "prompt": "Choose the natural English meaning of this new sentence: 'Vana vanoda kudya chingwa nemukaka mangwanani.'",
                "correct": "The children want to eat bread and milk in the morning.",
                "distractors": [
                    "We bought sugar, salt, and vegetables yesterday.",
                    "Father is cooking meat and sadza for dinner tonight.",
                    "The bread has run out so I am going to the shop.",
                ],
                "explanation": "'Vana' = 'The children', 'vanoda kudya' = 'want to eat', 'chingwa nemukaka' = 'bread and milk', 'mangwanani' = 'in the morning'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you say 'Add a little salt to the vegetables' in Shona?",
                "correct": "Isa munyu mushoma mumuriwo.",
                "distractors": ["Tenga shuga zhinji kuchitoro.", "Bika hupfu nemvura inopisa.", " Cheka chingwa nebangwa."],
                "explanation": "'Isa' = 'Put/add', 'munyu mushoma' = 'a little salt', 'mumuriwo' = 'in the vegetables'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "In 'Hupfu hwapera mumba', why does 'hwapera' ('has run out') start with 'hwa-'?",
                "correct": "Because 'hupfu' (maize meal) belongs to the 'hu-' noun group, which uses 'hwa-' in the recent past",
                "distractors": [
                    "Because 'hwa-' always means tomorrow",
                    "Because it refers to a person cooking in the kitchen",
                    "Because 'mumba' starts with 'm-'",
                ],
                "explanation": "Nouns starting with 'hu-' (like 'hupfu') use 'hu-' / 'hwa-' subject prefixes on the verb.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new kitchen sentence into English: 'Tichatenga mafuta ekubikisa nemadomasi pamusika.'",
                "correct": "We will buy cooking oil and tomatoes at the market.",
                "distractors": [
                    "They cooked sadza and green vegetables for the guests.",
                    "Please pour warm milk into the child's cup.",
                    "I ate roasted groundnuts and sweet potatoes at home.",
                ],
                "explanation": "'Tichatenga' = 'We will buy', 'mafuta ekubikisa' = 'cooking oil', 'nemadomasi' = 'and tomatoes', 'pamusika' = 'at the market'.",
            },
        ],
    },
    # 3. Colours & Clothing/Vehicles
    {
        "tags": {"tsvuku", "nhema", "chena", "ruchena", "rutema", "rutsvuku", "girinhi", "girini", "bhuruu", "ruvara", "mavara", "shangu", "hembe", "mbatya"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "How do you describe 'a white shirt and black shoes' in Shona?",
                "correct": "hembe chena neshangu nhema",
                "distractors": [
                    "hembe tsvuku neshangu chena",
                    "shangu dzeruvara rwegirinhi",
                    "mota nhema nemabhuku machena",
                ],
                "explanation": "'Hembe chena' = 'white shirt', 'ne-' = 'and', and 'shangu nhema' = 'black shoes'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Complete this sentence about tree leaves: 'Mashizha emuti uyu ane ruvara ______.' (The leaves of this tree have a green colour.)",
                "correct": "rwegirinhi",
                "distractors": ["rwutema", "rwuchena", "rwutsvuku"],
                "explanation": "'Ruvara rwegirinhi' expresses 'green colour' when describing fresh leaves ('mashizha').",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Mukoma wangu akatenga mota chena nezuro.'",
                "correct": "My older brother bought a white car yesterday.",
                "distractors": [
                    "My sister is wearing a red dress today.",
                    "Which bus goes to the city centre?",
                    "The black truck is parked beside the road.",
                ],
                "explanation": "'Mukoma wangu' = 'My older brother', 'akatenga' = 'bought', 'mota chena' = 'a white car', 'nezuro' = 'yesterday'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Why is 'white' written as 'chena' in 'hembe chena' (white shirt), but 'machena' in 'mabhuku machena' (white books)?",
                "correct": "Colour adjectives change their prefix to match the noun they describe ('ma-' for 'mabhuku')",
                "distractors": [
                    "'Machena' means light grey while 'chena' means bright white",
                    "Only clothing can use the word 'chena'",
                    "'Machena' is only used in the past tense",
                ],
                "explanation": "In Shona, traditional colour stems (-chena, -tema, -tsvuku) take the prefix of the noun they describe.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Which sentence means 'The girl is wearing a yellow hat and a blue dress'?",
                "correct": "Musikana akapfeka ngowani yeyero nerokwe rebhuruu.",
                "distractors": [
                    "Mukomana akapfeka bhachi dema neshangu tsvuku.",
                    "Vakadzi vaviri vakabata maamburera matsvuku.",
                    "Mbatya dzose dziri kuoma pamutambo panze.",
                ],
                "explanation": "'Ngowani yeyero' = 'a yellow hat', and 'nerokwe rebhuruu' = 'and a blue dress'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Ndeipi shangu yaunoda, nhema kana tsvuku?'",
                "correct": "Which shoe do you want, the black one or the red one?",
                "distractors": [
                    "Where did you put my white shirt and blue trousers?",
                    "These new shoes are very comfortable for walking.",
                    "She washed all the white clothes this morning.",
                ],
                "explanation": "'Ndeipi shangu yaunoda' = 'Which shoe do you want', 'nhema kana tsvuku' = 'the black one or the red one'.",
            },
        ],
    },
    # 4. Numbers, Time & Counting
    {
        "tags": {"chimwe", "maviri", "vaviri", "mbiri", "mitatu", "matatu", "nhatu", "mana", "vana", "mashanu", "maminitsi", "rechitatu"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "Which phrase correctly translates 'three books' in Shona? (Hint: 'mabhuku' is a 'ma-' plural noun.)",
                "correct": "mabhuku matatu",
                "distractors": ["mabhuku maviri", "mabhuku mana", "bhuku rimwe chete"],
                "explanation": "The number stem '-tatu' (three) takes the 'ma-' prefix to match 'mabhuku' -> 'mabhuku matatu'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you say 'two women and four men' in Shona?",
                "correct": "vakadzi vaviri nevarume vana",
                "distractors": [
                    "mukadzi mumwe nevarume vatatu",
                    "vakadzi vana nevarume vaviri",
                    "vana vashanu vari mumba",
                ],
                "explanation": "'Vakadzi vaviri' = 'two women' (-viri = 2) and 'nevarume vana' = 'and four men' (-na = 4).",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Tine mabhuku mana patafura.'",
                "correct": "We have four books on the table.",
                "distractors": [
                    "There are three cups in the kitchen.",
                    "Wait here for five minutes please.",
                    "Two children are reading outside.",
                ],
                "explanation": "'Tine' = 'We have', 'mabhuku mana' = 'four books', 'patafura' = 'on the table'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you form ordinal numbers like 'first', 'second', and 'third' in Shona?",
                "correct": "Attach '-ekutanga' (first), '-echipiri' (second), and '-echitatu' (third) with the noun's possessive prefix",
                "distractors": [
                    "Place the word 'nhamba' after the verb",
                    "Repeat the cardinal number twice",
                    "Add '-ka-' before the noun",
                ],
                "explanation": "Ordinal numbers use '-ekutanga' (1st), '-echipiri' (2nd), '-echitatu' (3rd), e.g., 'zuva rechitatu' ('the third day').",
            },
            {
                "type": "multiple_choice",
                "prompt": "Why do we say 'miti mitatu' for 'three trees' but 'zvigaro zvitatu' for 'three chairs'?",
                "correct": "The number stem '-tatu' takes 'mi-' for 'miti' (trees) and 'zvi-' for 'zvigaro' (chairs)",
                "distractors": [
                    "Because trees are taller than chairs",
                    "Because 'mitatu' means thirty and 'zvitatu' means three",
                    "Because 'miti' is singular and 'zvigaro' is plural",
                ],
                "explanation": "Numbers 1–5 mirror the prefix of the noun they count: 'miti mitatu', 'zvigaro zvitatu', 'vanhu vatatu'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Chitima chichasvika mushure memaminitsi mashanu.'",
                "correct": "The train will arrive after five minutes.",
                "distractors": [
                    "We waited at the bus stop for two hours.",
                    "Three buses left the station this morning.",
                    "This is my third time visiting Masvingo.",
                ],
                "explanation": "'Chitima chichasvika' = 'The train will arrive', 'mushure memaminitsi mashanu' = 'after five minutes'.",
            },
        ],
    },
    # 5. Locatives (pa-, ku-, mu-) & Household Objects
    {
        "tags": {"patafura", "tafura", "mumba", "kumba", "panze", "kunze", "kumusha", "kuchikoro", "kubasa", "kumusika", "pamusika", "makiyi", "bhuku", "kapu", "hwindo", "musuwo"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "Choose the right locative prefix: You want to say 'The keys are ON the table' ('______tafura').",
                "correct": "patafura",
                "distractors": ["kutafura", "mutafura", "netafura"],
                "explanation": "The prefix 'pa-' means 'on / at a specific surface', so 'pa-' + 'tafura' = 'patafura' ('on the table').",
            },
            {
                "type": "multiple_choice",
                "prompt": "What is the difference between 'mumba' and 'panze'?",
                "correct": "'mumba' means inside the house, while 'panze' means outside",
                "distractors": [
                    "'mumba' means at school, while 'panze' means at work",
                    "'mumba' means on the roof, while 'panze' means in the kitchen",
                    "'mumba' means rural village, while 'panze' means city centre",
                ],
                "explanation": "'Mu-' denotes 'inside' ('mumba' = inside the house), whereas 'panze' means 'outside in the yard'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Baba vari mumba asi vana vari kutamba panze.'",
                "correct": "Father is in the house, but the children are playing outside.",
                "distractors": [
                    "Mother went to the market to buy fruit and vegetables.",
                    "The books and keys are lying on the table.",
                    "We are going to the rural home tomorrow morning.",
                ],
                "explanation": "'Baba vari mumba' = 'Father is in the house', 'asi' = 'but', 'vana vari kutamba panze' = 'the children are playing outside'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Which locative word means 'in the kitchen'?",
                "correct": "mukicheni",
                "distractors": ["nekicheni", "kicheni", "vakicheni"],
                "explanation": "Adding 'mu-' ('inside') to 'kicheni' ('kitchen') gives 'mukicheni' ('in/inside the kitchen').",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you say 'There is a cup of water on the table' in Shona?",
                "correct": "Patafura pane kapu yemvura.",
                "distractors": [
                    "Mukapu mune shuga nemukaka.",
                    "Kumusika kune michero mizhinji.",
                    "Ndakaisa makiyi mumba.",
                ],
                "explanation": "'Patafura' ('on the table') pairs with 'pane' ('there is at/on that spot') + 'kapu yemvura' ('a cup of water').",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Ndasiya nharembozha yangu pachigaro mumba yokutandarira.'",
                "correct": "I left my mobile phone on the chair in the living room.",
                "distractors": [
                    "Please close the door and all the windows before sleeping.",
                    "My keys are inside the small bag on the table.",
                    "We are sitting under the shade tree outside the house.",
                ],
                "explanation": "'Ndasiya' = 'I left', 'nharembozha yangu' = 'my mobile phone', 'pachigaro' = 'on the chair', 'mumba yokutandarira' = 'in the living room'.",
            },
        ],
    },
    # 6. Family, School & Present Progressive (-ri ku-)
    {
        "tags": {"amai", "baba", "mbuya", "mwana", "vana", "hanzvadzi", "shamwari", "mudzidzisi", "chikoro", "bvunzo", "kirasi"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "Complete this sentence using the Present Progressive ('is reading right now'): 'Shamwari yangu ______ bhuku idzva.'",
                "correct": "iri kuverenga",
                "distractors": ["yakaverenga", "ichaverenga", "verenga"],
                "explanation": "'Shamwari' uses the progressive form 'iri ku-' + '-verenga' (read) to mean 'is reading right now'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Why do we say 'Mbuya vari kurima' instead of 'Mbuya ari kurima' when talking about one grandmother?",
                "correct": "Shona uses the plural prefix 'va-' ('vari') to show polite respect to elders and parents",
                "distractors": [
                    "Because 'mbuya' always refers to three or more people",
                    "Because 'vari' is only used for the future tense",
                    "Because 'ari' can only be used with inanimate objects",
                ],
                "explanation": "In Shona, respected family elders ('amai', 'baba', 'mbuya', 'sekuru') always take the polite plural 'va-' agreement.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Vana vari kudzidzira kunyora bvunzo kuchikoro.'",
                "correct": "The children are practicing to write examinations at school.",
                "distractors": [
                    "The teacher gave us new books yesterday morning.",
                    "My grandmother grows groundnuts and maize at the rural home.",
                    "My friend called me after finishing work today.",
                ],
                "explanation": "'Vana vari kudzidzira' = 'The children are practicing', 'kunyora bvunzo' = 'to write exams', 'kuchikoro' = 'at school'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you say 'Our teacher teaches us Shona every day'?",
                "correct": "Mudzidzisi wedu anotirayiridza ChiShona mazuva ose.",
                "distractors": [
                    "Vadzidzisi vakabvunza mibvunzo nezuro.",
                    "Ndiri kuenda kuchikoro neshamwari yangu.",
                    "Mwana ari kurara pamubhedha wake.",
                ],
                "explanation": "'Mudzidzisi wedu' = 'Our teacher', 'anotirayiridza' = 'teaches/instructs us', 'mazuva ose' = 'every day'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Which possessive word means 'our grandmother'?",
                "correct": "mbuya vedu",
                "distractors": ["mbuya wangu", "mbuya chenyu", "mbuya dzavo"],
                "explanation": "Because 'mbuya' takes the respectful 'va-' agreement, 'our grandmother' is 'mbuya vedu' ('va-' + '-edu').",
            },
            {
                "type": "translate",
                "prompt": "Translate this new family sentence into English: 'Hanzvadzi yangu inoshanda muguta reHarare.'",
                "correct": "My sibling works in the city of Harare.",
                "distractors": [
                    "My parents live at the rural homestead in Masvingo.",
                    "My friend passed all her school examinations this year.",
                    "The baby is sleeping quietly inside the bedroom.",
                ],
                "explanation": "'Hanzvadzi yangu' = 'My sibling (brother/sister)', 'inoshanda' = 'works', 'muguta reHarare' = 'in the city of Harare'.",
            },
        ],
    },
    # 7. Weather, Nature, Farming & Future/Past Events
    {
        "tags": {"mvura", "mhepo", "zuva", "makore", "rwizi", "makomo", "miti", "muti", "munda", "goho", "gohwo", "imbwa", "zvipembere", "shiri"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "Complete this future weather forecast: 'Mangwana zuva ______ zvakanaka.' (Tomorrow the sun will shine brightly.)",
                "correct": "richabuda",
                "distractors": ["rakabuda", "riri kubuda", "buda"],
                "explanation": "'Zuva' (sun) takes the prefix 'ri-' + future marker '-cha-' + '-buda' (come out/shine) -> 'richabuda'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "If a farmer says 'Gore rino takawana goho guru pamunda pedu', what happened?",
                "correct": "They obtained a big harvest from their field this year",
                "distractors": [
                    "They are waiting for the rain to start next month",
                    "The river flooded and washed away the bridge",
                    "A strong wind blew from the east all afternoon",
                ],
                "explanation": "'Takawana' = 'we obtained/got', 'goho guru' = 'a big harvest', 'pamunda pedu' = 'from our field'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Mhepo iri kuvhuvhuta uye mvura ichanaya manheru.'",
                "correct": "The wind is blowing and it will rain in the evening.",
                "distractors": [
                    "The river is full of water after yesterday's heavy rain.",
                    "Tall green trees grow along the sides of the mountain.",
                    "The dog barked outside when it saw the visitors.",
                ],
                "explanation": "'Mhepo iri kuvhuvhuta' = 'The wind is blowing', 'uye' = 'and', 'mvura ichanaya manheru' = 'it will rain in the evening'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you say 'Tall trees and green grass' in Shona?",
                "correct": "miti mirefu neuswa hwegirinhi",
                "distractors": [
                    "makomo makuru nerwizi rwurefu",
                    "maruva machena nemashizha matema",
                    "munda mukuru nemvura zhinji",
                ],
                "explanation": "'Miti mirefu' = 'tall trees' (plural 'mi-' agreement on '-refu'), and 'neuswa hwegirinhi' = 'and green grass'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "In 'Shiri diki dziri kuimba pamusoro pemuti', what are the small birds doing?",
                "correct": "Singing at the top of the tree",
                "distractors": [
                    "Drinking water beside the river",
                    "Flying across the high mountains",
                    "Looking for seeds in the field",
                ],
                "explanation": "'Shiri diki' = 'small birds', 'dziri kuimba' = 'are singing', 'pamusoro pemuti' = 'at the top of the tree'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new nature sentence into English: 'Makomo makuru anoonekwa kure seri kwerwizi.'",
                "correct": "Large mountains can be seen far away beyond the river.",
                "distractors": [
                    "Two rhinoceroses are grazing peacefully in the valley.",
                    "The farmers planted maize and groundnuts after the rain.",
                    "Dark clouds have covered the sky this afternoon.",
                ],
                "explanation": "'Makomo makuru' = 'Large mountains', 'anoonekwa' = 'are seen / can be seen', 'kure seri kwerwizi' = 'far away beyond the river'.",
            },
        ],
    },
    # 8. Transport, City Life, Markets & Descriptions
    {
        "tags": {"mota", "motokari", "bhazi", "kombi", "rori", "gonyeti", "mugwagwa", "rwendo", "marobhotsi", "robhoti", "dhorobha", "guta"},
        "drills": [
            {
                "type": "multiple_choice",
                "prompt": "In a Zimbabwean city, if a driver says 'Mota dzakamira parobhoti dzichimirira mwenje wegirinhi', where are the cars stopped?",
                "correct": "At the traffic light waiting for the green light",
                "distractors": [
                    "At a rural bus stop waiting for passengers",
                    "Inside a garage having their tyres repaired",
                    "Beside a river bridge that is under construction",
                ],
                "explanation": "'Robhoti' (plural 'marobhotsi') is the standard Shona word for a traffic light, and 'mwenje wegirinhi' is the green light.",
            },
            {
                "type": "multiple_choice",
                "prompt": "Complete this sentence about travelling: 'Mangwana ______ bhazi rinoenda kuMasvingo.' (Tomorrow we will board the bus going to Masvingo.)",
                "correct": "tichakwira",
                "distractors": ["takakwira", "tiri kukwira", "kwirai"],
                "explanation": "'Ti-' (we) + '-cha-' (future 'will') + '-kwira' (board/climb) = 'tichakwira' ('we will board').",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Kombi chena iri kufamba pamugwagwa mukuru.'",
                "correct": "The white minibus is travelling along the main road.",
                "distractors": [
                    "The large red truck is parked at the fuel station.",
                    "Two people are standing beside the shop in town.",
                    "Our journey to the mountains was long but enjoyable.",
                ],
                "explanation": "'Kombi chena' = 'The white minibus', 'iri kufamba' = 'is travelling', 'pamugwagwa mukuru' = 'along the main road'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "What does 'parutivi pemugwagwa' mean in 'Rori yakamira parutivi pemugwagwa'?",
                "correct": "Beside the road / on the side of the road",
                "distractors": [
                    "In the middle of the intersection",
                    "Inside the city parking building",
                    "Across the railway tracks",
                ],
                "explanation": "'Parutivi pe-' means 'beside / at the side of', and 'mugwagwa' is 'road'.",
            },
            {
                "type": "multiple_choice",
                "prompt": "How do you say 'Our journey was very good' in Shona?",
                "correct": "Rwendo rwedu rwakanga rwakanaka kwazvo.",
                "distractors": [
                    "Mugwagwa uyu murefu zvikuru.",
                    "Bhazi richasimuka mangwanani-ngwanani.",
                    "Vanhu vazhinji vanoshandisa makombi muguta.",
                ],
                "explanation": "'Rwendo rwedu' = 'Our journey' (taking 'rw-' agreement), 'rwakanga rwakanaka kwazvo' = 'was very good'.",
            },
            {
                "type": "translate",
                "prompt": "Translate this new sentence into English: 'Vanhu vakamira pamusika vachimirira kukwira bhazi.'",
                "correct": "People are standing at the market waiting to board the bus.",
                "distractors": [
                    "The driver stopped the car near the traffic lights.",
                    "We saw two large trucks carrying maize to the city.",
                    "The road to the eastern highlands has many curves.",
                ],
                "explanation": "'Vanhu vakamira pamusika' = 'People are standing at the market', 'vachimirira kukwira bhazi' = 'waiting to board the bus'.",
            },
        ],
    },
]


def generate_contextual_exercises(
    shona_text: str, english_translation: str, lesson_number: int
) -> list[dict[str, object]]:
    """Generates 3 varied, purposeful exercises based on the grammar and thematic vocabulary of the lesson,
    using BRAND-NEW sentences and deterministically rotating the correct option position.
    """
    lower = shona_text.lower()
    words = set(re.findall(r"[a-z']+", lower))

    # Score each thematic pool by tag overlap with the current lesson
    scored_pools: list[tuple[int, int, dict[str, object]]] = []
    for pool_idx, pool in enumerate(THEMATIC_NEW_EXERCISES):
        tags = pool["tags"]  # type: ignore[index]
        overlap = len(words & tags)  # type: ignore[operator]
        scored_pools.append((overlap, -pool_idx, pool))

    scored_pools.sort(reverse=True)
    primary_pool = scored_pools[0][2]
    secondary_pool = scored_pools[(lesson_number % (len(scored_pools) - 1)) + 1][2]

    primary_drills: list[dict[str, object]] = list(primary_pool["drills"])  # type: ignore[arg-type]
    secondary_drills: list[dict[str, object]] = list(secondary_pool["drills"])  # type: ignore[arg-type]

    # Pick 2 drills from the best-matching thematic pool and 1 drill from a complementary grammar pool
    chosen_raw = [
        primary_drills[lesson_number % len(primary_drills)],
        primary_drills[(lesson_number + 1) % len(primary_drills)],
        secondary_drills[lesson_number % len(secondary_drills)],
    ]

    exercises: list[dict[str, object]] = []
    for ex_idx, raw in enumerate(chosen_raw):
        correct = str(raw["correct"])
        distractors = [str(d) for d in raw["distractors"]]  # type: ignore[union-attr]
        rotated_opts = _rotate_options(correct, distractors, seed=lesson_number * 3 + ex_idx)
        ex_type = str(raw["type"])
        exercises.append({
            "exercise_type": ex_type,
            "prompt": str(raw["prompt"]),
            "options": rotated_opts,
            "correct_answer": correct,
            "explanation": str(raw["explanation"]),
        })

    return exercises


# Brand-new Review Exercise Bank (9 review blocks x 6 unique exercises = 54 brand-new review questions)
REVIEW_BLOCK_NEW_EXERCISES: dict[int, list[dict[str, object]]] = {
    1: [
        {"type": "multiple_choice", "prompt": "Review 1 — Greeting & Politeness: How do you say 'Good morning, did you wake up well?' to an elder?", "correct": "Mangwanani, mamuka zvakanaka here?", "distractors": ["Manheru, waswera zvakanaka here?", "Masikati, uri kuenda kupi?", "Mhoro, ndapedza basa rangu."], "explanation": "'Mangwanani' is used in the morning and 'mamuka zvakanaka here?' politely asks if they woke up well."},
        {"type": "multiple_choice", "prompt": "Review 1 — Polite Commands: Change the singular command 'Uya kuno!' ('Come here!') into the polite/plural form:", "correct": "Uyai kuno!", "distractors": ["Kuuya kuno!", "Ndauya kuno!", " rega kuuya!"], "explanation": "Adding '-i' to an imperative verb stem ('uya' -> 'uyai') makes it plural or respectful."},
        {"type": "multiple_choice", "prompt": "Review 1 — Household Actions: Which verb means 'Close the window gently'?", "correct": "Vhara hwindo zvinyoronyoro.", "distractors": ["Tora hwindo nekukasira.", "Vhura musuwo zvakasimba.", "Gara pedyo nehwindo."], "explanation": "'Vhara' means 'close', 'hwindo' is 'window', and 'zvinyoronyoro' means 'gently / quietly'."},
        {"type": "multiple_choice", "prompt": "Review 1 — Expressing Purpose: What does 'kuti tidye tese' mean in 'Ugosvika manheru kuti tidye tese'?", "correct": "so that we may eat together", "distractors": ["because we already ate", "before you cook dinner", "if you want to drink water"], "explanation": "'Kuti' + subjunctive 'tidye' ('that we eat') + 'tese' ('all of us / together') expresses purpose."},
        {"type": "multiple_choice", "prompt": "Review 1 — Sequence Commands: In 'Tora bhuku undipe', what does 'undipe' mean?", "correct": "and give it to me", "distractors": ["and read it outside", "and put it on the bed", "before you go to school"], "explanation": "'U-' (you) + '-ndi-' (me) + '-pe' (give) means 'and give me'."},
        {"type": "translate", "prompt": "Review 1 — Translate this new review sentence: 'Ndapota gara pasi umirire amai.'", "correct": "Please sit down and wait for Mother.", "distractors": ["Please open the door and help Father.", "Congratulations on finishing your work today.", "Return home quickly before it rains."], "explanation": "'Ndapota' = 'Please', 'gara pasi' = 'sit down', 'umirire amai' = 'and wait for Mother'."},
    ],
    2: [
        {"type": "multiple_choice", "prompt": "Review 2 — Food & Shopping: How do you say 'I bought bread and milk at the shop' in Shona?", "correct": "Ndakatenga chingwa nemukaka kuchitoro.", "distractors": ["Ndichabika sadza nemuriwo kumba.", "Tiri kutsvaga shuga nemunyu patafura.", "Vana vanoda kunwa mvura inodziya."], "explanation": "'Ndakatenga' = 'I bought', 'chingwa nemukaka' = 'bread and milk', 'kuchitoro' = 'at the shop'."},
        {"type": "multiple_choice", "prompt": "Review 2 — Colours & Questions: Complete the question: '______ hembe yaunoda kupfeka, chena kana tsvuku?' (Which shirt do you want to wear, the white one or the red one?)", "correct": "Ndeipi", "distractors": ["Sei", "Here", "Kupi"], "explanation": "'Ndeipi' asks 'Which one?' for nouns like 'mota' (car) or 'hembe' (shirt)."},
        {"type": "multiple_choice", "prompt": "Review 2 — Talking About Time: If someone says 'Chimirira kwemaminitsi mashanu chete', how long are they asking you to wait?", "correct": "For only five minutes", "distractors": ["Until tomorrow morning", "For three whole days", "Until the end of the month"], "explanation": "'Maminitsi mashanu' = 'five minutes', and 'chete' = 'only'."},
        {"type": "multiple_choice", "prompt": "Review 2 — Future Plans ('-cha-'): Which verb correctly completes 'Mangwana ______ sadza nenyama' ('Tomorrow we will cook sadza and meat')?", "correct": "tichabika", "distractors": ["takabika", "tiri kubika", "vanobika"], "explanation": "'Ti-' (we) + '-cha-' (will) + '-bika' (cook) = 'tichabika'."},
        {"type": "multiple_choice", "prompt": "Review 2 — Negative Present: In 'Ndiri kutsvaga makiyi angu asi handisi kuawona', what does 'handisi kuawona' mean?", "correct": "I do not see them", "distractors": ["I left them in the car", "I found them on the table", "I will buy new ones tomorrow"], "explanation": "'Handisi' ('I am not') + 'ku-a-wona' ('seeing them [the keys]') means 'I do not see them'."},
        {"type": "translate", "prompt": "Review 2 — Translate this new review sentence: 'Wedzera shuga shoma mukapu yetii.'", "correct": "Add a little sugar into the cup of tea.", "distractors": ["Put the warm water on the table please.", "We bought maize meal and cooking oil yesterday.", "I feel hungry when I wake up early."], "explanation": "'Wedzera' = 'Add', 'shuga shoma' = 'a little sugar', 'mukapu yetii' = 'into the cup of tea'."},
    ],
    3: [
        {"type": "multiple_choice", "prompt": "Review 3 — Family & Present Progressive: How do you say 'My friends are studying in the house'?", "correct": "Shamwari dzangu dziri kudzidza mumba.", "distractors": ["Shamwari yangu yakadzidza nezuro.", "Vana vari kutamba panze.", "Mudzidzisi ari kunyora pachidziro."], "explanation": "Plural 'shamwari dzangu' ('my friends') takes 'dziri ku-' + '-dzidza' ('are studying') + 'mumba' ('in the house')."},
        {"type": "multiple_choice", "prompt": "Review 3 — 'Before' Clauses ('-sati'): How do you say 'Let me rest a little before I cook'?", "correct": "Rega ndimbozorora zvishoma ndisati ndabika.", "distractors": ["Ndiri kubika sadza kana ndazorora.", "Ndapedza kubika saka ndiri kuzorora.", "Usabike sadza tisati tasvika."], "explanation": "'Ndisati ndabika' literally means 'before I have cooked'."},
        {"type": "multiple_choice", "prompt": "Review 3 — School & Exams: What does 'kupasa bvunzo dzekupedzisira' mean?", "correct": "to pass the final examinations", "distractors": ["to read a short story in class", "to bring our books to school tomorrow", "to ask the teacher a question"], "explanation": "'Kupasa' = 'to pass', 'bvunzo' = 'examinations', and 'dzekupedzisira' = 'final / last'."},
        {"type": "multiple_choice", "prompt": "Review 3 — Giving Reasons ('nokuti'): Complete the sentence: 'Tiri kutaura tichizevezera ______ mwana akarara.' (We are speaking in whispers because the baby is asleep.)", "correct": "nokuti", "distractors": ["kuti", "asi", "kana"], "explanation": "'Nokuti' (or 'nekuti') means 'because'."},
        {"type": "multiple_choice", "prompt": "Review 3 — Laundry & Household Chores: If you say 'Mbatya dzangu dzaoma panze', what happened to your clothes?", "correct": "My clothes have dried outside", "distractors": ["My clothes are still wet in the house", "I will wash my clothes tomorrow morning", "I bought new clothes at the market"], "explanation": "'Mbatya dzangu' = 'my clothes', 'dzaoma' = 'have dried', 'panze' = 'outside'."},
        {"type": "translate", "prompt": "Review 3 — Translate this new review sentence: 'Tichasangana naBaba kumusha svondo rinouya.'", "correct": "We will meet Father at the rural home next week.", "distractors": ["We visited Grandmother at the clinic yesterday.", "Mother is buying vegetables at the market today.", "My sibling is writing an essay at school."], "explanation": "'Tichasangana naBaba' = 'We will meet Father', 'kumusha' = 'at the rural home', 'svondo rinouya' = 'next week'."},
    ],
    4: [
        {"type": "multiple_choice", "prompt": "Review 4 — Proverbs & Wisdom: In the proverb 'Chara chimwe hachitswanyi inda', why does 'chimwe' ('one') start with 'chi-'?", "correct": "Because it agrees with 'chara' (thumb/finger), which is a 'chi-' noun", "distractors": ["Because all numbers in Shona start with 'chi-'", "Because it is in the past tense", "Because 'inda' starts with 'i-'"], "explanation": "'Chara' belongs to the 'chi-' noun group, so 'one finger' is 'chara chimwe' and the negative verb is 'hachi-tswanyi'."},
        {"type": "multiple_choice", "prompt": "Review 4 — Weather & Directions: How do you say 'A strong wind is blowing from the east'?", "correct": "Mhepo ine simba iri kuvhuvhuta ichibva kumabvazuva.", "distractors": ["Mvura zhinji ichanaya manheru ano.", "Zuva riri kubuda pamusoro pemakomo.", "Rwizi rwuzere nemvura inotonhora."], "explanation": "'Mhepo ine simba' = 'A strong wind', 'iri kuvhuvhuta' = 'is blowing', 'ichibva kumabvazuva' = 'coming from the east'."},
        {"type": "multiple_choice", "prompt": "Review 4 — Consecutive Past ('-ka-'): In 'Zuva rakabuda mbatya dzikaoma', why does the second verb use '-ka-' ('dzikaoma')?", "correct": "It expresses a consecutive result ('and consequently dried')", "distractors": ["It expresses a negative command", "It means the clothes will dry next week", "It asks a question about the clothes"], "explanation": "After a past verb ('rakabuda'), '-ka-' on the following verb ('dzikaoma') means 'and then / and as a result'."},
        {"type": "multiple_choice", "prompt": "Review 4 —Polite Requests: What does 'ndinokumbirawo undibatsire kusimudza tafura' mean?", "correct": "I kindly ask that you help me lift the table", "distractors": ["Please put the books on top of the table", "I already cleaned the table in the kitchen", "Do not sit on the small table outside"], "explanation": "'Ndinokumbirawo' = 'I kindly request', 'undibatsire' = 'that you help me', 'kusimudza tafura' = 'to lift the table'."},
        {"type": "multiple_choice", "prompt": "Review 4 — Feelings & Conditions: How do you say 'We felt very happy when we saw our grandmother'?", "correct": "Takafara chose patakaona mbuya vedu.", "distractors": ["Ticharara panze kana zuva radoka.", "Vana vanonzwa nzara mangwanani.", "Imbwa iri kuhukura pamusuwo."], "explanation": "'Takafara chose' = 'We were very happy', and 'patakaona' ('pa-' = when) = 'when we saw'."},
        {"type": "translate", "prompt": "Review 4 — Translate this new review sentence: 'Kana tikashanda pamwe chete, tichapedza basa racho nekukurumidza.'", "correct": "If we work together, we will finish the work quickly.", "distractors": ["Although the work was hard, we finished it yesterday.", "Please help me carry these tools to the field.", "The elders taught us many wise proverbs at home."], "explanation": "'Kana tikashanda pamwe chete' = 'If we work together', 'tichapedza basa racho' = 'we will finish the work', 'nekukurumidza' = 'quickly'."},
    ],
    5: [
        {"type": "multiple_choice", "prompt": "Review 5 — Concessive Clauses ('Kunyangwe'): Which sentence means 'Even though the river is wide, they crossed safely'?", "correct": "Kunyangwe rwizi rwakafara, vakayambuka zvakanaka.", "distractors": ["Kana rwizi rwuzere, hatigoni kuyambuka nhasi.", "Rwizi urwu runoyerera ruchienda kumabvazuva.", "Vana vari kutamba pedyo nerwizi."], "explanation": "'Kunyangwe' introduces an 'although / even though' clause, followed by 'vakayambuka zvakanaka' ('they crossed safely')."},
        {"type": "multiple_choice", "prompt": "Review 5 — Relative Clauses: What does ' nzira inoenda kumunda' mean?", "correct": "the path that goes to the field", "distractors": ["we are walking along the path", "the field is far from the road", "go to the field tomorrow morning"], "explanation": "'Inoenda' acts as a relative verb modifying 'nzira' ('path') -> 'the path which goes'."},
        {"type": "multiple_choice", "prompt": "Review 5 — Passive Voice ('-wa'): How do you say 'The maize was planted in November'?", "correct": "Chibage chakadyarwa muna Mbudzi.", "distractors": ["Varimi vanodyara chibage muna Mbudzi.", "Tichadyara chibage kana mvura yanaya.", "Chibage chiri kukura zvakanaka mumunda."], "explanation": "Adding '-wa' to '-dyara' (plant) forms the passive '-dyarwa' ('was planted')."},
        {"type": "multiple_choice", "prompt": "Review 5 — Reflexive Prefix ('-zvi-'): In 'Anofanira kuzvibata zvakanaka', what does '-zvi-' do?", "correct": "It means 'himself / herself / oneself' (to conduct oneself well)", "distractors": ["It makes the verb negative", "It refers to plural objects on the table", "It indicates the distant past tense"], "explanation": "The reflexive prefix '-zvi-' placed right before the verb stem means 'oneself' ('kuzvibata' = to behave/control oneself)."},
        {"type": "multiple_choice", "prompt": "Review 5 — Farming & Harvest: What is the meaning of 'Tarisiro yedu ndeyekuwana goho guru gore rino'?", "correct": "Our hope is to obtain a bountiful harvest this year", "distractors": ["We already sold all our harvest at the market", "Last year the rain was very scarce in our village", "The farmers are repairing their tools in the yard"], "explanation": "'Tarisiro yedu' = 'Our hope/expectation', 'ndeyekuwana goho guru' = 'is to obtain a big harvest', 'gore rino' = 'this year'."},
        {"type": "translate", "prompt": "Review 5 — Translate this new review sentence: 'Mvura yakanaya usiku hwese saka ivhu rakanyorova.'", "correct": "It rained all night long, so the soil is moist.", "distractors": ["The sun shone brightly all day and dried the grass.", "We will plant groundnuts and maize next week.", "The river water is clean and cool in the morning."], "explanation": "'Mvura yakanaya usiku hwese' = 'It rained the whole night', 'saka' = 'so', 'ivhu rakanyorova' = 'the soil is wet/moist'."},
    ],
    6: [
        {"type": "multiple_choice", "prompt": "Review 6 — Describing Clothing & Colours: How do you say 'The woman is wearing a green dress and white shoes'?", "correct": "Mukadzi akapfeka rokwe regirinhi neshangu chena.", "distractors": ["Murume akatenga hembe tsvuku neshangu nhema.", "Musikana ane bvudzi refu nemhete chena.", "Vana vakapfeka mbatya dzekuchikoro nhasi."], "explanation": "'Akapfeka' = 'is wearing (state)', 'rokwe regirinhi' = 'a green dress', 'neshangu chena' = 'and white shoes'."},
        {"type": "multiple_choice", "prompt": "Review 6 — Stative Verbs ('-ka-'): Why does 'akapfeka' (using '-ka-') translate as 'is wearing' in the present?", "correct": "With posture and clothing verbs (-pfeka, -gara, -mira), '-ka-' describes a present resulting state", "distractors": ["Because Shona has no present tense for clothing", "Because it only refers to clothes worn last year", "Because '-ka-' is the future marker"], "explanation": "Verbs of state like '-pfeka' (put on -> be wearing), '-gara' (sit -> be seated), and '-mira' (stand -> be standing) use '-ka-' for the current state."},
        {"type": "multiple_choice", "prompt": "Review 6 — Market Scenes: In 'Vakadzi vaviri vakagara pasi peamburera', where are the two women seated?", "correct": "Underneath an umbrella", "distractors": ["Inside a grocery shop", "On top of a wooden bench", "Beside a large bus"], "explanation": "'Pasi pe-' means 'underneath / below', so 'pasi peamburera' is 'under an umbrella'."},
        {"type": "multiple_choice", "prompt": "Review 6 — Containers & Produce: What does 'migomo miviri izere nemichero' mean?", "correct": "two buckets full of fruit", "distractors": ["three bowls of cooked vegetables", "four bags of white maize meal", "two cups of fresh milk"], "explanation": "'Migomo miviri' = 'two buckets', 'izere ne-' = 'full of', and 'michero' = 'fruits'."},
        {"type": "multiple_choice", "prompt": "Review 6 — Traditional Delicacies: What are 'madora' in Zimbabwean cuisine?", "correct": "Protein-rich mopane caterpillars, often roasted or cooked with tomatoes and onions", "distractors": ["Sweet pastries served with morning tea", "Clay pots used for storing cool drinking water", "Woven baskets used for winnowing grain"], "explanation": "'Madora' (mopane worms) are a prized, nutritious traditional delicacy across Zimbabwe."},
        {"type": "translate", "prompt": "Review 6 — Translate this new review sentence: 'Pamusika pane vanhu vazhinji vari kutenga mbatatisi nemadomasi.'", "correct": "At the market there are many people buying potatoes and tomatoes.", "distractors": ["Inside the shop there are red shirts and black shoes.", "Two girls are walking along the road carrying baskets.", "My mother cooked rice and chicken for our guests."], "explanation": "'Pamusika pane' = 'At the market there are', 'vanhu vazhinji vari kutenga' = 'many people buying', 'mbatatisi nemadomasi' = 'potatoes and tomatoes'."},
    ],
    7: [
        {"type": "multiple_choice", "prompt": "Review 7 — Home & Living Room Vocabulary: What is 'imba yokutandarira' in English?", "correct": "The living room / sitting room (room for socializing)", "distractors": ["The kitchen where food is prepared", "The outdoor granary for storing maize", "The classroom at a secondary school"], "explanation": "From '-tandara' (spend time chatting/socializing), 'imba yokutandarira' is the living room."},
        {"type": "multiple_choice", "prompt": "Review 7 — Spatial Prepositions: How do you say 'in the middle of the room' in Shona?", "correct": "pakati peimba", "distractors": ["pamusoro peimba", "parutivi peimba", "seri kweimba"], "explanation": "'Pakati pe-' means 'in the middle / centre of'."},
        {"type": "multiple_choice", "prompt": "Review 7 — Kitchen Appliances: Which Shona sentence describes 'a white refrigerator and brown cupboards'?", "correct": "firiji chena nemakabati ebhurauni", "distractors": ["tebhuro diki nezvigaro zviviri", "gaba remaruva nemabhuku matatu", "hwindo guru nemusuwo muchena"], "explanation": "'Firiji chena' = 'white refrigerator', and 'nemakabati ebhurauni' = 'and brown cupboards'."},
        {"type": "multiple_choice", "prompt": "Review 7 — Describing Objects: In 'gaba remaruva rine ruvara rwebhuruu', what is blue?", "correct": "The flower vase", "distractors": ["The flowers inside the garden", "The wooden table in the corner", "The curtain on the window"], "explanation": "'Gaba remaruva' means 'flower vase / pot of flowers', and 'rine ruvara rwebhuruu' means 'it has a blue colour'."},
        {"type": "multiple_choice", "prompt": "Review 7 — Garden Tools: What are 'badza, foshoro, nehara' used for?", "correct": "Cultivating the field and tending the garden (hoe, shovel, and rake)", "distractors": ["Cooking sadza and relish in the kitchen", "Writing examinations in a school classroom", "Repairing minibuses and trucks in town"], "explanation": "'Badza' is a hand hoe, 'foshoro' is a shovel/spade, and 'hara' is a garden rake."},
        {"type": "translate", "prompt": "Review 7 — Translate this new review sentence: 'Pamusoro petebhuro pane gaba remaruva machena.'", "correct": "On top of the table there is a vase of white flowers.", "distractors": ["Beside the house there is a large green water tank.", "Inside the kitchen there are four chairs and a stove.", "Underneath the tree there are farm tools and buckets."], "explanation": "'Pamusoro petebhuro' = 'On top of the table', 'pane' = 'there is', 'gaba remaruva machena' = 'a vase of white flowers'."},
    ],
    8: [
        {"type": "multiple_choice", "prompt": "Review 8 — Transport & City Vocabulary: What does the word 'marobhotsi' mean when driving in Harare or Bulawayo?", "correct": "Traffic lights", "distractors": ["Roundabouts", "Pedestrian bridges", "Bus terminals"], "explanation": "In Zimbabwean usage, 'robhoti' (singular) / 'marobhotsi' (plural) refers to traffic lights."},
        {"type": "multiple_choice", "prompt": "Review 8 — Vehicles & Numbers: How do you say 'two white commuter minibuses and one large haulage truck'?", "correct": "makombi machena maviri negonyeti guru rimwe chete", "distractors": ["mabhazi matatu matsvuku nemotokari nhema mbiri", "ngoro yemadhongi nemabhasikoro mana", "chitima chirefu nemarori mashanu"], "explanation": "'Makombi machena maviri' = 'two white minibuses', and 'negonyeti guru rimwe chete' = 'and one large haulage truck'."},
        {"type": "multiple_choice", "prompt": "Review 8 — Rural Transport: What is 'ngoro yemadhongi'?", "correct": "A donkey-drawn cart", "distractors": ["A passenger train", "A wooden canoe on the river", "A mountain bicycle"], "explanation": "'Ngoro' is a cart/wagon and 'yemadhongi' means 'of donkeys' (donkey-drawn)."},
        {"type": "multiple_choice", "prompt": "Review 8 — Participles ('-chi-'): In 'Vanhu vakamira parutivi pemugwagwa vachimirira bhazi', what does 'vachimirira' mean?", "correct": "while waiting for (they waiting for)", "distractors": ["after they boarded", "because they missed", "they will never wait for"], "explanation": "The participial marker '-chi-' in 'vachimirira' means 'while waiting for'."},
        {"type": "multiple_choice", "prompt": "Review 8 — Location Phrases: What does 'parutivi pemugwagwa' mean?", "correct": "beside the road / on the side of the road", "distractors": ["in the middle of the bridge", "at the end of the journey", "inside the bus station"], "explanation": "'Parutivi pe-' means 'at the side of / beside', and 'mugwagwa' is 'road'."},
        {"type": "translate", "prompt": "Review 8 — Translate this new review sentence: ' Motokari dzakamira parobhoti nokuti mwenje mutsvuku wakabaka.'", "correct": "The cars are stopped at the traffic light because the red light is on.", "distractors": ["The white minibus is turning left near the big shop.", "People are crossing the street in the city centre.", "The haulage truck is carrying goods to the market."], "explanation": "'Motokari dzakamira parobhoti' = 'The cars are stopped at the traffic light', 'nokuti mwenje mutsvuku wakabaka' = 'because the red light is lit/on'."},
    ],
    9: [
        {"type": "multiple_choice", "prompt": "Review 9 — History & Heritage: Why is Great Zimbabwe called 'Masvingo eGreat Zimbabwe'?", "correct": "Because 'masvingo' means fortified dry-stone walls or enclosures", "distractors": ["Because 'masvingo' means tall green trees", "Because it is located beside the Indian Ocean", "Because 'masvingo' means modern glass buildings"], "explanation": "'Masvingo' refers to the monumental stone enclosures built by ancestors of the Shona people."},
        {"type": "multiple_choice", "prompt": "Review 9 — Wildlife & Nature: In 'zvipembere zviviri zviri kufura uswa', what are the two rhinoceroses doing?", "correct": "Grazing on grass", "distractors": ["Drinking water from the river", "Sleeping under a shady tree", "Running across the mountain"], "explanation": "'Zviri kufura' means 'are grazing', and 'uswa' (or 'huswa') means 'grass'."},
        {"type": "multiple_choice", "prompt": "Review 9 — National Flag Colours: Which five colours appear on the national flag of Zimbabwe ('mureza weZimbabwe')?", "correct": "Green (girinhi), yellow (yero), red (tsvuku), black (tema), and white (chena)", "distractors": ["Blue, purple, orange, pink, and grey", "Only green and white", "Red, blue, and gold only"], "explanation": "The Zimbabwean flag features horizontal stripes of green, yellow, red, and black with a white triangle bearing the Zimbabwe Bird."},
        {"type": "multiple_choice", "prompt": "Review 9 — Water Storage & Households: Why are Jojo tanks ('matangi emvura eJojo') placed on elevated brick or steel stands?", "correct": "To store household water and provide gravity pressure for taps", "distractors": ["To serve as watchtowers for wildlife", "To dry maize and groundnuts in the sun", "To shelter livestock during the rainy season"], "explanation": "Elevated water tanks store borehole or municipal water so households have a reliable supply."},
        {"type": "multiple_choice", "prompt": "Review 9 — Ordinal Numbers: How do you say 'the first person, the second person, and the third person'?", "correct": "munhu wekutanga, wechipiri, newechitatu", "distractors": ["vanhu vatatu vari mumba", "munhu mumwe nevanhu vaviri", "wekupedzisira chete"], "explanation": "'Wekutanga' = 'first' (of beginning), 'wechipiri' = 'second', and 'wechitatu' = 'third'."},
        {"type": "translate", "prompt": "Review 9 — Translate this new cumulative sentence: 'Nzvimbo iyi inoratidza nhoroondo yakakosha yevanhu vekare nemagariro avo.'", "correct": "This place shows the important history of the ancient people and their way of life.", "distractors": ["These mountains have many green trees and clean rivers.", "The visitors took photographs of the two rhinoceroses.", "We learned many Shona words, proverbs, and grammar rules."], "explanation": "'Nzvimbo iyi inoratidza' = 'This place shows', 'nhoroondo yakakosha' = 'important history', 'yevanhu vekare nemagariro avo' = 'of the ancient people and their way of life'."},
    ],
}


def generate_comprehensive_review(
    preceding_lessons: list[object], review_num: int
) -> dict[str, object]:
    """Synthesizes a rich 3-section textbook ReviewSummary and 6 brand-new review exercises
    (never copy-pasted from regular lessons) for every 7th Review Lesson.
    """
    block_idx = review_num // 7
    lesson_nums = [ getattr(l, "lesson_number", 0) for l in preceding_lessons ]
    range_str = f"Lessons {lesson_nums[0]}–{lesson_nums[-1]}" if lesson_nums else f"Unit {block_idx}"

    # 1. Extract vocabulary highlights & grammar themes from the preceding 6 lessons
    vocab_points: list[str] = []
    grammar_points: list[str] = []
    culture_points: list[str] = []
    topics_covered: list[str] = []

    for l in preceding_lessons:
        shona = (getattr(l, "shona_text", "") or "").strip()
        eng = (getattr(l, "english_translation", "") or "").strip()
        l_num = getattr(l, "lesson_number", 0)
        if shona and eng:
            short_shona = shona if len(shona) <= 95 else shona[:92] + "..."
            short_eng = eng if len(eng) <= 95 else eng[:92] + "..."
            vocab_points.append(f"Lesson {l_num}: \"{short_shona}\" — {short_eng}")

        g_notes = getattr(l, "grammar_notes", []) or []
        for gn in g_notes[:1]:
            if isinstance(gn, dict):
                t = gn.get("title", "")
                r = gn.get("rule", "")
            else:
                t = getattr(gn, "title", "")
                r = getattr(gn, "rule", "")
            if t and t not in topics_covered:
                topics_covered.append(t)
                grammar_points.append(f"{t}: {r}" if r else t)

        c_notes = getattr(l, "cultural_notes", []) or []
        if isinstance(c_notes, list) and c_notes:
            cn0 = c_notes[0]
            ct = cn0.get("title", "") if isinstance(cn0, dict) else getattr(cn0, "title", "")
            cc = cn0.get("content", "") if isinstance(cn0, dict) else getattr(cn0, "content", "")
            if ct and len(culture_points) < 3:
                first_sent = cc.split(". ")[0] + "." if cc else ""
                culture_points.append(f"{ct}: {first_sent}")

    if not grammar_points:
        grammar_points = [
            "Subject Prefixes & Verb Tenses: Identifying who is acting (ndi-, u-, a-, ti-, va-) and when (-no- present, -ri ku- ongoing, -ka- past, -cha- future).",
            "Locative Prefixes (pa-, ku-, mu-): Expressing 'on/at' (pa-), 'to/from' (ku-), and 'inside' (mu-).",
            "Word Order: Placing the noun first followed by possessives, colours, and numbers.",
        ]

    if not culture_points:
        culture_points = [
            "Respect & Politeness (Hunhu): Using plural forms and polite requests in daily family and community life.",
            "Everyday Zimbabwean Context: Connecting language structures to real-life settings at home, markets, farms, and towns.",
        ]

    summary_obj = {
        "title": f"Unit {block_idx} Comprehensive Review ({range_str})",
        "sections": [
            {
                "heading": f"1. Key Expressions & Sentences Reviewed ({range_str})",
                "points": vocab_points[:6],
            },
            {
                "heading": "2. Core Shona Grammar Rules Consolidated",
                "points": grammar_points[:5],
            },
            {
                "heading": "3. Cultural Context & Practical Usage",
                "points": culture_points[:3],
            },
        ],
    }

    # Build 6 brand-new review exercises specifically for this review unit
    if block_idx in REVIEW_BLOCK_NEW_EXERCISES:
        raw_list = REVIEW_BLOCK_NEW_EXERCISES[block_idx]
    else:
        # Combine fresh synthesis exercises tailored to upper-intermediate/advanced blocks (Blocks 4..9)
        raw_list = [
            {
                "type": "multiple_choice",
                "prompt": f"Unit {block_idx} Review — Grammar Mastery: How do you say 'Although it rained heavily, we arrived home safely'?",
                "correct": "Kunyangwe mvura yakanaya zvakanyanya, takasvika kumba zvakanaka.",
                "distractors": [
                    "Kana mvura ikanaya mangwana, hatisi kuenda kumunda.",
                    "Mvura iri kunaya kunze saka vana vari mumba.",
                    "Zuva rakabuda masikati mbatya dzikaoma nekukurumidza.",
                ],
                "explanation": "'Kunyangwe' means 'although / even though', 'yakanaya' is past tense ('rained'), and 'takasvika' is 'we arrived'.",
            },
            {
                "type": "multiple_choice",
                "prompt": f"Unit {block_idx} Review — Numbers & Colours: Which phrase means 'three white trucks and two black cars'?",
                "correct": "marori machena matatu nemotokari nhema mbiri",
                "distractors": [
                    "rori chena imwe nemotokari tsvuku nhatu",
                    "makombi maviri chena nemabhazi mana matema",
                    "shangu nhema mbiri nehembe tsvuku imwe",
                ],
                "explanation": "'Marori machena matatu' = 'three white trucks' and 'nemotokari nhema mbiri' = 'and two black cars'.",
            },
            {
                "type": "multiple_choice",
                "prompt": f"Unit {block_idx} Review — Locatives & Existence: Which word means 'Inside the wooden bowl there are roasted caterpillars'?",
                "correct": "Mundiro yemuti mune madora akakangwa.",
                "distractors": [
                    "Patafura pane mabhuku nezvinyoreso.",
                    "Kumusika kune michero nemiriwo mizhinji.",
                    "Parutivi pemugwagwa pane miti mirefu.",
                ],
                "explanation": "'Mu-' ('inside') + 'ndiro yemuti' ('wooden bowl') pairs with 'mune' ('there is inside').",
            },
            {
                "type": "multiple_choice",
                "prompt": f"Unit {block_idx} Review — Conditionals & Reciprocal Verbs: What does 'tikashanda nesimba tichibatsirana' mean?",
                "correct": "if we work hard helping one another",
                "distractors": [
                    "when they finished working at the market",
                    "because he worked alone in the field",
                    "before you start writing the examination",
                ],
                "explanation": "'Tikashanda nesimba' = 'if we work with strength/hard', and 'tichibatsirana' ('-an-' reciprocal suffix) = 'helping each other'.",
            },
            {
                "type": "multiple_choice",
                "prompt": f"Unit {block_idx} Review — Cultural & Historical Vocabulary: What does the phrase 'zvivakwa zvematombo' refer to?",
                "correct": "stone structures / buildings of stone (the origin of the name Zimbabwe)",
                "distractors": [
                    "wooden handles used on farm hoes and shovels",
                    "modern traffic lights at city intersections",
                    "plastic tanks mounted beside houses to store water",
                ],
                "explanation": "'Zvivakwa' means 'buildings / structures' and 'zvematombo' means 'of stones'.",
            },
            {
                "type": "translate",
                "prompt": f"Unit {block_idx} Review — Translate this new synthesis sentence into English: 'Vanhu vazhinji vari kutengesa michero nemiriwo pamusika.'",
                "correct": "Many people are selling fruits and vegetables at the market.",
                "distractors": [
                    "Our ancestors built stone walls without mortar long ago.",
                    "Two women are sitting under an umbrella near the road.",
                    "We are planning to visit our grandparents next month.",
                ],
                "explanation": "'Vanhu vazhinji' = 'Many people', 'vari kutengesa' = 'are selling', 'michero nemiriwo' = 'fruits and vegetables', 'pamusika' = 'at the market'.",
            },
        ]

    review_exercises: list[dict[str, object]] = []
    for idx, item in enumerate(raw_list[:6]):
        correct = str(item["correct"])
        distractors = [str(d) for d in item["distractors"]]  # type: ignore[union-attr]
        opts = _rotate_options(correct, distractors, seed=review_num * 5 + idx)
        review_exercises.append({
            "exercise_type": str(item["type"]),
            "prompt": str(item["prompt"]),
            "options": opts,
            "correct_answer": correct,
            "explanation": str(item["explanation"]),
        })

    return {
        "review_summary": summary_obj,
        "key_noun_classes_covered": topics_covered[:5] or ["Sentence Structure", "Verb Tenses", "Locatives & Descriptions"],
        "review_exercises": review_exercises,
    }

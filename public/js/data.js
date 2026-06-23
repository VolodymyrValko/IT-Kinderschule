// Дані курсів, викладачів, відгуків, FAQ (двомовні).
window.DATA = {
  courses: [
    {
      id: 'scratch', icon: 'bi-puzzle', cls: 'c-scratch', cats: ['young', 'coding'],
      age: '7–12', schedule: 'СБ 16:30–19:00',
      uk: { title: 'Scratch', desc: 'Перші кроки у програмуванні: діти створюють власні ігри та анімації, розвиваючи логіку, креативність і вміння працювати в команді.' },
      de: { title: 'Scratch', desc: 'Erste Schritte beim Programmieren: Kinder erstellen eigene Spiele und Animationen und entwickeln Logik und Kreativität.' },
    },
    {
      id: 'microbit', icon: 'bi-cpu', cls: 'c-microbit', cats: ['young', 'robotics'],
      age: '10–14', schedule: 'СБ 16:30–19:00',
      uk: { title: 'BBC micro:bit', desc: 'Діти створюють справжні розумні пристрої на платі BBC micro:bit — сучасному інструменті для навчання робототехніки та програмування.' },
      de: { title: 'BBC micro:bit', desc: 'Kinder bauen echte smarte Geräte mit dem BBC micro:bit — einem modernen Werkzeug für Robotik und Programmierung.' },
    },
    {
      id: 'arduino', icon: 'bi-motherboard', cls: 'c-arduino', cats: ['teen', 'robotics'],
      age: '12–18', schedule: 'СБ 16:30–19:00',
      uk: { title: 'Arduino', desc: 'Програмування та створення роботів на базі мікроконтролера Arduino. Для тих, хто цікавиться електронікою, схемами та програмуванням.' },
      de: { title: 'Arduino', desc: 'Programmieren und Roboterbau mit dem Mikrocontroller Arduino. Für alle, die sich für Elektronik und Schaltungen interessieren.' },
    },
    {
      id: 'ai', icon: 'bi-cpu-fill', cls: 'c-ai', cats: ['teen', 'robotics', 'coding'],
      age: '12–18', schedule: 'СБ 16:30–19:00',
      uk: { title: 'Штучний інтелект', desc: 'Створюємо та використовуємо роботизовані пристрої на базі штучного інтелекту (AI). Сучасний напрямок для допитливих підлітків.' },
      de: { title: 'Künstliche Intelligenz', desc: 'Wir bauen und nutzen robotergestützte Geräte auf Basis von KI. Eine moderne Richtung für neugierige Jugendliche.' },
    },
    {
      id: 'webdev', icon: 'bi-code-slash', cls: 'c-webdev', cats: ['teen', 'coding'],
      age: '12–18', schedule: 'СБ 16:30–19:00',
      uk: { title: 'HTML + CSS + JS', desc: 'Веброзробка з нуля: від першої сторінки до інтерактивного сайту. Не лише хобі, а й основа майбутньої професії у сфері ІТ.' },
      de: { title: 'HTML + CSS + JS', desc: 'Webentwicklung von Grund auf: von der ersten Seite bis zur interaktiven Website — die Basis für einen IT-Beruf.' },
    },
  ],

  // ключі курсів для майстра форми (значення = id для бекенда)
  courseOptions: [
    { value: 'scratch', icon: 'bi-puzzle', uk: 'Scratch', de: 'Scratch' },
    { value: 'microbit', icon: 'bi-cpu', uk: 'BBC micro:bit', de: 'BBC micro:bit' },
    { value: 'arduino', icon: 'bi-motherboard', uk: 'Arduino', de: 'Arduino' },
    { value: 'ai', icon: 'bi-cpu-fill', uk: 'Штучний інтелект', de: 'Künstliche Intelligenz' },
    { value: 'webdev', icon: 'bi-code-slash', uk: 'HTML+CSS+JS', de: 'HTML+CSS+JS' },
    { value: 'unsure', icon: 'bi-question-circle', uk: 'Допоможіть обрати', de: 'Beim Auswählen helfen' },
  ],

  teachers: [
    { initials: 'IT', uk: { name: 'Команда викладачів', role: 'Інженери та розробники', bio: 'Практики з досвідом у робототехніці, електроніці та веброзробці, які вміють захопити дітей.' }, de: { name: 'Lehrkräfte-Team', role: 'Ingenieure & Entwickler', bio: 'Praktiker mit Erfahrung in Robotik, Elektronik und Webentwicklung, die Kinder begeistern.' } },
    { initials: 'AI', uk: { name: 'Наставники з AI', role: 'Курс штучного інтелекту', bio: 'Допомагають підліткам зрозуміти, як працює сучасний штучний інтелект — на практиці.' }, de: { name: 'KI-Mentoren', role: 'Kurs künstliche Intelligenz', bio: 'Helfen Jugendlichen praxisnah zu verstehen, wie moderne KI funktioniert.' } },
    { initials: 'RB', uk: { name: 'Тренери з робототехніки', role: 'micro:bit та Arduino', bio: 'Перетворюють складні інженерні концепції на захопливі ігрові завдання.' }, de: { name: 'Robotik-Trainer', role: 'micro:bit & Arduino', bio: 'Verwandeln komplexe Technik in spannende, spielerische Aufgaben.' } },
  ],

  reviews: [
    { initials: 'АК', uk: { text: 'Син просто в захваті! Раніше не відривався від ігор, а тепер сам просить нові набори, щоб збирати щось вдома. Дякую IT Kinderschule!', name: 'Анна К.', role: 'Мама учня' }, de: { text: 'Mein Sohn ist begeistert! Früher nur Videospiele, jetzt baut er selbst zu Hause. Danke IT Kinderschule!', name: 'Anna K.', role: 'Mutter eines Schülers' } },
    { initials: 'ІП', uk: { text: 'Найкраща інвестиція в розвиток дитини. Бачу, як у доньки розвивається логіка. Викладачі — справжні професіонали.', name: 'Іван П.', role: 'Тато учениці' }, de: { text: 'Die beste Investition in mein Kind. Die Logik meiner Tochter wächst sichtbar. Die Lehrkräfte sind echte Profis.', name: 'Ivan P.', role: 'Vater einer Schülerin' } },
    { initials: 'О', uk: { text: 'Тут дуже круто! Ми збирали робота, який їздить по чорній лінії. Складно, але цікаво. Я знайшов нових друзів.', name: 'Олег', role: 'Учень, 11 років' }, de: { text: 'Hier ist es super! Wir haben einen Roboter gebaut, der einer Linie folgt. Schwer, aber spannend. Neue Freunde gefunden!', name: 'Oleg', role: 'Schüler, 11 Jahre' } },
  ],

  faq: [
    { uk: { q: 'Що потрібно для першого заняття?', a: 'Нічого спеціального — лише гарний настрій і бажання творити. Ноутбуки, плати та набори робототехніки ми надаємо.' }, de: { q: 'Was wird für die erste Stunde benötigt?', a: 'Nichts Besonderes — nur gute Laune. Laptops, Boards und Robotik-Sets stellen wir.' } },
    { uk: { q: 'Дитина ніколи не програмувала. Підійдуть курси?', a: 'Так! Курси розраховані на різний рівень, зокрема абсолютних новачків. Ми починаємо з азів і поступово ускладнюємо.' }, de: { q: 'Mein Kind hat nie programmiert. Passen die Kurse?', a: 'Ja! Die Kurse sind für jedes Niveau, auch für absolute Anfänger. Wir starten bei den Grundlagen.' } },
    { uk: { q: 'Скільки коштує пробне заняття?', a: 'Перше пробне заняття безкоштовне. Залиште заявку — і ми узгодимо зручний час.' }, de: { q: 'Was kostet die Probestunde?', a: 'Die erste Probestunde ist kostenlos. Senden Sie eine Anfrage — wir finden einen Termin.' } },
    { uk: { q: 'Де і коли проходять заняття?', a: 'Überseering 26, 22297 Hamburg (Ukraine Haus). Заняття щосуботи, 16:30–19:00.' }, de: { q: 'Wo und wann findet der Unterricht statt?', a: 'Überseering 26, 22297 Hamburg (Ukraine Haus). Jeden Samstag, 16:30–19:00.' } },
    { uk: { q: 'Якою мовою проходять заняття?', a: 'Заняття проводяться українською мовою у дружньому середовищі. За потреби допоможемо й німецькомовним учням.' }, de: { q: 'In welcher Sprache findet der Unterricht statt?', a: 'Der Unterricht ist auf Ukrainisch in einem freundlichen Umfeld. Deutschsprachige Schüler unterstützen wir ebenfalls.' } },
  ],
};

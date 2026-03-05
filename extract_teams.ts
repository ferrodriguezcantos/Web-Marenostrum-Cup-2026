import fs from 'fs';
try {
    const buf = fs.readFileSync('tournament.db.corrupted');
    const content = buf.toString('utf8');
    
    // Try to find JSON-like objects for teams
    const teamMatches = content.match(/\{"id":\d+,"name":"[^"]+","category":"[^"]+","group_name":"[^"]+"[^}]*\}/g);
    if (teamMatches) {
        console.log('Found Team JSONs:', teamMatches.length);
        console.log(JSON.stringify(teamMatches.slice(0, 5), null, 2));
    }

    // Try to find raw team names and categories
    // In SQLite, strings are often stored near each other.
    // Let's look for the categories first and see what's around them.
    const categories = [
        'Alevin Mixto',
        'Infantil Mixto',
        'Cadete Masculino',
        'Cadete Femenino',
        'Juvenil Masculino'
    ];
    
    for (const cat of categories) {
        let pos = -1;
        while ((pos = content.indexOf(cat, pos + 1)) !== -1) {
            const snippet = content.slice(Math.max(0, pos - 50), pos + 100);
            console.log(`Snippet around "${cat}":`, JSON.stringify(snippet));
        }
    }

} catch (e) {
    console.error(e);
}

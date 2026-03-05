import fs from 'fs';
try {
    const buf = fs.readFileSync('tournament.db.corrupted');
    console.log('File size:', buf.length);
    const strings = buf.toString('utf8').match(/[a-zA-Z0-9\s]{4,}/g);
    if (strings) {
        const uniqueStrings = Array.from(new Set(strings)).filter(s => 
            s.includes('BM') || s.includes('Club') || s.includes('Handbol') || s.includes('Alevin') || s.includes('Infantil')
        );
        console.log('Found strings:', uniqueStrings);
    } else {
        console.log('No strings found');
    }
} catch (e) {
    console.error(e);
}

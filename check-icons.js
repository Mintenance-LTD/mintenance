const LucideIcons = require('lucide-react');

const iconsToCheck = [
    'User',
    'Clipboard',
    'FileText',
    'PoundSterling',
    'BarChart3',
    'Users',
    'Info'
];

console.log('Checking Lucide Icons availability:');
iconsToCheck.forEach(icon => {
    console.log(`${icon}: ${!!LucideIcons[icon] ? 'Found' : 'MISSING'}`);
});

console.log('\nTotal icons exported:', Object.keys(LucideIcons).length);

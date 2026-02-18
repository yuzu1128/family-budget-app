const url = 'https://kzqtvqccaixjxwfklntu.supabase.co';
console.log(`Testing connection to: ${url}`);

fetch(url)
    .then(res => {
        console.log(`Status: ${res.status}`);
        console.log('Connection Successful');
    })
    .catch(err => {
        console.error('Connection Failed:', err.cause || err);
    });

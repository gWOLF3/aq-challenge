const fs = require('fs'); 
const csv = require('csv-parser');

fs.createReadStream('./data.csv')
.pipe(csv())
.on('data', function(data){
    try {
        console.log('data:', data)
        //perform the operation
    }
    catch(err) {
        //error handler
    }
})
.on('end',function(){
    //some final operation
});  

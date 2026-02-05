// creates a new qcow2 img
import * as readline from 'readline';
import fs from 'fs';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let fileName: string = "disk.qcow2";
let fileSize: number = 10; // gb
let fileLocation: string = "./isos/";

rl.question('File Name (default disk.qcow2): ', (answer) => {
    fileName = answer || "disk.qcow2";
    
    rl.question('Size (GB) (default 10GB): ', (answer) => {
        fileSize = parseInt(answer) || 10;
        
        rl.question('Location (defaults to "./isos/, will create folder if it does not exist): ', (answer) => {
            fileLocation = answer || "./isos/";
            rl.close();
            
        });
    });
});


rl.on('close', () => {
    const fullPath = `${fileLocation}${fileName}`;

    // check file doesn't already exist
    if (fs.existsSync(fullPath)) {
        console.error(`File ${fullPath} already exists. Please choose a different name or location.`);
        return;
    }

    // create directory if it doesn't exist
    if (!fs.existsSync(fileLocation)) {
        fs.mkdirSync(fileLocation, { recursive: true });
    }

    const command = `qemu-img create -f qcow2 ${fullPath} ${fileSize}G`;
    
    console.log(`Creating qcow2 image with command: ${command}`);
    
    const { exec } = require('child_process');
    exec(command, (error: any, stdout: string, stderr: string) => {
        if (error) {
            console.error(`Error creating qcow2 image: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error output: ${stderr}`);
            return;
        }
        console.log(`qcow2 image created successfully at ${fullPath}`);
    });
});
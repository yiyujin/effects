export const sourceCode = `
function delay(time){
    *return new Promise(
        *(resolve, reject) => {
        *if(isNaN(time)){
            reject(new Error("time has to be a number."));
        }

        *setTimeout(resolve, time);
    })
}
`;
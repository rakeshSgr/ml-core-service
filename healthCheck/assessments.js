/**
 * name : assessmentService.js.
 * author : Aman Karki.
 * created-date : 02-Feb-2021.
 * Description : Assessment service health check functionality.
*/

// Dependencies 
const request = require('request');

/**
   * Assessment service health check.
   * @function
   * @name health_check
   * @returns {Boolean} - true/false.
*/

function health_check() {
    return new Promise(async (resolve, reject) => {
        try {

            let healthCheckUrl = 
            process.env.ASSESSMENT_SERIVCE_HOST +  "/healthCheckStatus";

            const options = {
                headers : {
                    "content-type": "application/json"
                }
            };
            
            request.get(healthCheckUrl,options,assessmentCallback);

            function assessmentCallback(err, data) {

                let result = false;

                if (err) {
                    result = false;
                } else {
                    
                    let response = JSON.parse(data.body);
                    if( response.status === 200 ) {
                        result = true;
                    } else {
                        result = false;
                    }
                }
                return resolve(result);
            }

        } catch (error) {
            return reject(error);
        }
    })
}

module.exports = {
    health_check : health_check
}
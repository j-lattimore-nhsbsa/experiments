// External dependencies
const express = require('express');
const router = express.Router();

const https = require('https');

//
// LOAD JSON FUNCTION
//
async function _loadJSON( packageName, packageURL ){

    let loadedJSON = {};

    try{

        loadedJSON = await new Promise(function( resolve, reject ){

            https.get( packageURL, function( packageResp ) {

                let data = '';
                
                if( packageResp.statusCode === 200 ){

                    packageResp.on( 'data', function( chunk ){
                        data += chunk;
                    });

                    packageResp.on( 'end', function(){
                        try {

                            const jsonData = JSON.parse(data);
                            jsonData.packageName = packageName;
                            resolve( jsonData );

                        } catch (err) {
                            reject( err );
                        }
                    });

                } else {
                    reject( new Error('File not found') );
                }

            });

        });

    } catch( err ) {
        loadedJSON.message = err.message;
    }

    return loadedJSON;

};

//
// GET REPOS FUNCTION
//
async function _getRepos( repos, page ){

    page = ( page || page === 0 ) ? page : 0;
    repos = ( Array.isArray(repos) && repos.length > 0 ) ? repos : [];

    const { Octokit } = await import('octokit');
    const octokit = new Octokit({ 
        auth: process.env.GITHUB_TOKEN
    });

    const org = 'nhsbsa';

    await octokit.request('GET /orgs/{org}/repos?per_page=100&page={page}', {
                org: org,
                page: page
            }).then(function( resp ){

                if( resp && resp.data && Array.isArray( resp.data ) ){

                    resp.data.forEach(function( prototype ){

                        const packageName = prototype.name;
                        const branchName = prototype.default_branch;
                        const packageURL = 'https://raw.githubusercontent.com/'+org+'/'+packageName+'/'+branchName+'/package.json';

                        const obj = {
                            packageName: packageName,
                            packageURL: packageURL
                        };

                        repos.push( obj );

                    });

                    if( resp.data.length === 100 ){
                        page++;
                        console.log( 'TRIGGERING AGAIN' );
                        repos = _getRepos( repos, page );
                    }
                    
                }
                
            });

    return repos;

};

router.get(/prototype-kit-versions/, async (req, res, next) => {

    if( !(req.session.data.prototypes instanceof Object) ){

        try {

            const repos = await _getRepos();
            const promises = [];

            repos.forEach(function( prototype ){
                promises.push( _loadJSON( prototype.packageName, prototype.packageURL ) );
            });

            Promise.allSettled(promises).then( function(results){

                const prototypes = {
                    govuk: [],
                    nhsuk: []
                };

                results.forEach(function( result ){

                    if( result.value && result.value.name ){

                        const obj = {};

                        obj.name = result.value.packageName;
                        obj.type = result.value.name;
                        obj.version = result.value.version;
                        

                        if( result.value.name === 'nhsuk-prototype-kit' ){
                            prototypes.nhsuk.push(obj);
                        }

                        if( result.value.name === 'govuk-prototype-kit' ){
                            prototypes.govuk.push(obj);
                        }

                    }

                });

                req.session.data.prototypes = prototypes;
                res.locals.prototypes = prototypes;

                res.render('prototype-kit-versions/index.html');

            });

        } catch (err) {
            next(err);
        }
    } else {
        next();
    }

});

module.exports = router;

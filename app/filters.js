module.exports = function (env) { /* eslint-disable-line func-names,no-unused-vars */
  const filters = {};

  //
  // GET PROTOTYPE ROWS FILTER
  //
  filters.getPrototypeRows = function( prototypes, type ){

    type = ( type && ['nhsuk','govuk'].indexOf( type ) > -1 ) ? type : 'nhsuk';

    const rows = [];

    if( prototypes instanceof Object ){
      prototypes[type].forEach( function( row ){
        rows.push([
          {
            text: row.name
          },
          {
            text: row.version
          }
        ]);
      });
    }

    return rows;

  };

  return filters;
};

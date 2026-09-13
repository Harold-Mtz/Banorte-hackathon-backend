require('dotenv/config');
(async()=>{
  let failed=false;
  const {pool}=require('../dist/config/database');
  try {await pool.query('SELECT 1');console.log('PostgreSQL: conectado');} catch(error){failed=true;console.log('PostgreSQL: no disponible ('+(error.code??'connection error')+')');} finally {await pool.end();}
  try {const {GeminiClient}=require('../dist/ai/gemini-client');const response=await new GeminiClient().generate([{role:'user',content:'Return only FIRST_HOME'}]);console.log('Gemini: '+(response.includes('FIRST_HOME')?'respuesta verificada':'respuesta inesperada'));} catch(error){failed=true;console.log('Gemini: no disponible ('+(error.status??error.code??'configuration or network error')+')');}
  process.exitCode=failed?1:0;
})();

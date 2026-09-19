const express = require('express');
const { authRequired } = require('../auth');
const router = express.Router();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
function assertConfig(){ if(!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase Auth is not configured'); }
async function supabaseAuth(path, body){
  assertConfig();
  const response=await fetch(SUPABASE_URL+'/auth/v1/'+path,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(data.error_description||data.msg||data.message||'Supabase Auth request failed');e.status=response.status;throw e;}
  return data;
}
function normalizeUser(user){return user?{id:user.id,email:user.email||null,name:user.user_metadata?.name||null,createdAt:user.created_at||null}:null;}
router.post('/register',async(req,res,next)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(),name=String(req.body?.name||'').trim(),password=String(req.body?.password||'');
  if(!/^\S+@\S+\.\S+$/.test(email)||name.length<2||password.length<8)return res.status(400).json({error:'Valid email, name, and password (minimum 8 characters) are required'});
  try{const data=await supabaseAuth('signup',{email,password,data:{name}});res.status(201).json({data:normalizeUser(data.user),session:data.session||null,requiresEmailConfirmation:!data.session});}
  catch(error){if(error.status)return res.status(error.status).json({error:error.message});next(error);}
});
router.post('/login',async(req,res,next)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
  if(!email||!password)return res.status(400).json({error:'Email and password are required'});
  try{const data=await supabaseAuth('token?grant_type=password',{email,password});res.json({data:normalizeUser(data.user),session:{access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at,expires_in:data.expires_in}});}
  catch(error){if(error.status)return res.status(error.status).json({error:error.message});next(error);}
});
router.get('/me',authRequired,async(req,res)=>res.json({data:req.user}));
module.exports=router;
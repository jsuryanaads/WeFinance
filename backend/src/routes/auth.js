const express = require('express');
const pool = require('../db');
const { createToken, hashPassword, verifyPassword, authRequired } = require('../auth');
const router = express.Router();
const normalize = row => ({ id: row.id, email: row.email, name: row.name, createdAt: row.created_at });

router.post('/register', async (req,res,next)=>{
  const email=String(req.body?.email||'').trim().toLowerCase();
  const name=String(req.body?.name||'').trim();
  const password=String(req.body?.password||'');
  if(!/^\S+@\S+\.\S+$/.test(email)||name.length<2||password.length<8)
    return res.status(400).json({error:'Valid email, name, and password (minimum 8 characters) are required'});
  try{
    const passwordHash=await hashPassword(password);
    const result=await pool.query('INSERT INTO profiles (email,name,password_hash) VALUES ($1,$2,$3) RETURNING id,email,name,created_at',[email,name,passwordHash]);
    const user=normalize(result.rows[0]);
    res.status(201).json({data:user,token:createToken(user)});
  }catch(error){if(error.code==='23505')return res.status(409).json({error:'Email is already registered'});next(error);}
});
router.post('/login',async(req,res,next)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
  if(!email||!password)return res.status(400).json({error:'Email and password are required'});
  try{
    const result=await pool.query('SELECT id,email,name,password_hash,created_at FROM profiles WHERE lower(email)=lower($1)',[email]);
    if(!result.rowCount||!(await verifyPassword(password,result.rows[0].password_hash)))return res.status(401).json({error:'Invalid email or password'});
    const user=normalize(result.rows[0]);res.json({data:user,token:createToken(user)});
  }catch(error){next(error);}
});
router.get('/me',authRequired,async(req,res,next)=>{
  try{const result=await pool.query('SELECT id,email,name,created_at FROM profiles WHERE id=$1',[req.user.id]);if(!result.rowCount)return res.status(401).json({error:'User not found'});res.json({data:normalize(result.rows[0])});}catch(error){next(error);}
});
module.exports=router;
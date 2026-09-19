const express=require('express');
const pool=require('../db');
const router=express.Router();
const normalize=row=>({id:row.id,userId:row.user_id,name:row.name,type:row.type,isSystem:row.is_system,createdAt:row.created_at,updatedAt:row.updated_at});
router.get('/',async(req,res,next)=>{
  try{const result=await pool.query('SELECT * FROM categories WHERE is_system=true OR user_id=$1 ORDER BY is_system DESC,name ASC',[req.user.id]);res.json({data:result.rows.map(normalize)});}catch(error){next(error);}
});
router.post('/',async(req,res,next)=>{
  const name=String(req.body?.name||'').trim(),type=String(req.body?.type||'expense');
  if(!name)return res.status(400).json({error:'name is required'});
  if(!['income','expense'].includes(type))return res.status(400).json({error:'type must be income or expense'});
  try{const result=await pool.query('INSERT INTO categories(user_id,name,type) VALUES($1,$2,$3) RETURNING *',[req.user.id,name,type]);res.status(201).json({data:normalize(result.rows[0])});}
  catch(error){if(error.code==='23505')return res.status(409).json({error:'Category already exists'});next(error);}
});
module.exports=router;
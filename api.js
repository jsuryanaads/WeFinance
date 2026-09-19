(function(){
  const apiMeta=document.querySelector('meta[name="wefinance-api-url"]');
  const supabaseUrlMeta=document.querySelector('meta[name="supabase-url"]');
  const supabaseKeyMeta=document.querySelector('meta[name="supabase-publishable-key"]');
  const API_URL=(apiMeta?.content||localStorage.getItem('wefinance_api_url')||'').replace(/\/$/,'');
  const SUPABASE_URL=(supabaseUrlMeta?.content||'').replace(/\/$/,'');
  const SUPABASE_KEY=supabaseKeyMeta?.content||'';
  const supabaseClient=(window.supabase&&SUPABASE_URL&&SUPABASE_KEY)?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  window.WF_API={
    enabled:!!API_URL,
    url:API_URL,
    token:'',
    user:null,
    async refreshSession(){
      if(!supabaseClient){this.token='';this.user=null;return null;}
      const {data,error}=await supabaseClient.auth.getSession();
      if(error)throw error;
      this.token=data.session?.access_token||'';
      this.user=data.session?.user||null;
      return data.session||null;
    },
    async request(path,options={}){
      if(!API_URL)throw new Error('API URL belum dikonfigurasi');
      await this.refreshSession();
      const headers={'Content-Type':'application/json',...(options.headers||{})};
      if(this.token)headers.Authorization='Bearer '+this.token;
      const res=await fetch(API_URL+path,{...options,headers});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||('API error '+res.status));
      return data;
    },
    async login(email,password){
      if(!supabaseClient)throw new Error('Supabase Auth belum dikonfigurasi');
      const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
      if(error)throw error;
      this.token=data.session?.access_token||'';this.user=data.user||null;
      return this.user;
    },
    async register(name,email,password){
      if(!supabaseClient)throw new Error('Supabase Auth belum dikonfigurasi');
      const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{name}}});
      if(error)throw error;
      this.token=data.session?.access_token||'';this.user=data.user||null;
      if(!data.session)throw new Error('Pendaftaran berhasil. Silakan konfirmasi email sebelum masuk.');
      return this.user;
    },
    async logout(){
      if(supabaseClient)await supabaseClient.auth.signOut();
      this.token='';this.user=null;location.reload();
    },
    async bootstrap(){return (await this.request('/api/migration/bootstrap')).data;},
    async sync(){return this.request('/api/sync',{method:'POST',body:JSON.stringify({wallets,transactions,categories:typeof categories!=='undefined'?categories:[]})});}
  };
  if(supabaseClient)supabaseClient.auth.onAuthStateChange(()=>window.WF_API.refreshSession().catch(()=>{}));
})();
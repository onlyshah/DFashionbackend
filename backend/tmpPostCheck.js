const models = require('./models_sql');
(async () => {
  const Post = models._raw?.Post || models.Post;
  const User = models._raw?.User || models.User;
  const cnt1 = await Post.count({ where: { status: 'published' } });
  console.log('c1', cnt1);
  const list = await Post.findAll({ where: { status: 'published' } });
  console.log('l', list.length);
  const list2 = await Post.findAll({ where: { status: 'published' }, include: [{ model: User, as: 'author', required: false }] });
  console.log('l2', list2.length);
  for (const p of list2) {
    console.log('p', p.id, p.userId, p.toJSON().author);
  }
  process.exit(0);
})();
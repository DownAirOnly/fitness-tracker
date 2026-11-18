// Built-in offline reference estimates. Values are generic, not brand labels.
// One reference serving per item. This catalog is read-only and NOT copied into
// an account until explicitly customized; no network or external API required.
// Review package labels for actual product nutrition and cooked/raw distinctions.
const rows=[
 // Grains & starches
 ['Cooked white rice (1 cup)','grains',205,4.3,'1 cup, cooked',['cooked white rice','white rice (cooked)']],
 ['Cooked brown rice (1 cup)','grains',216,5,'1 cup, cooked'],
 ['Uncooked white rice (1 cup)','grains',675,12.5,'1 cup, dry'],
 ['Cooked jasmine rice (1 cup)','grains',205,4.3,'1 cup, cooked'],
 ['Cooked basmati rice (1 cup)','grains',205,4.3,'1 cup, cooked'],
 ['Cooked pasta (1 cup)','grains',200,7.2,'1 cup, cooked'],
 ['Dry pasta (2 oz)','grains',200,7,'2 oz, dry'],
 ['Cooked quinoa (1 cup)','grains',222,8.1,'1 cup, cooked'],
 ['Rolled oats (1/2 cup dry)','grains',150,5,'1/2 cup, dry'],
 ['All-purpose flour (1 cup)','grains',455,13,'1 cup, dry'],
 ['White bread (1 slice)','grains',80,2.7,'1 slice'],
 ['Whole-wheat bread (1 slice)','grains',80,4,'1 slice'],
 ['Potato (1 medium)','grains',160,4,'1 medium potato'],
 ['Sweet potato (1 medium)','grains',112,2,'1 medium potato'],
 ['Corn tortilla (1 tortilla)','grains',60,1.6,'1 small tortilla'],
 ['Flour tortilla (1 medium)','grains',140,4,'1 medium tortilla'],
 ['Panko breadcrumbs (1/4 cup)','grains',110,4,'1/4 cup'],
 ['Cooked rice noodles (1 cup)','grains',190,3,'1 cup, cooked'],
 // Proteins
 ['Large egg (1 egg)','protein',72,6.3,'1 large egg',['large egg','egg (large)','egg']],
 ['Egg white (1 large)','protein',17,3.6,'1 large white'],
 ['Chicken breast, cooked (100 g)','protein',165,31,'100 g, cooked'],
 ['Chicken breast, raw (100 g)','protein',120,23,'100 g, raw'],
 ['Chicken thigh, cooked (100 g)','protein',209,26,'100 g, cooked'],
 ['Lean ground beef, cooked (100 g)','protein',217,26,'100 g, cooked'],
 ['Ground turkey 93%, raw (100 g)','protein',176,19,'100 g, raw'],
 ['Salmon, cooked (100 g)','protein',206,22,'100 g, cooked'],
 ['Shrimp, cooked (100 g)','protein',99,24,'100 g, cooked'],
 ['Tuna in water, drained (100 g)','protein',116,26,'100 g, drained'],
 ['Tofu, firm (100 g)','protein',144,17,'100 g'],
 ['Black beans, cooked (1 cup)','protein',227,15.2,'1 cup, cooked'],
 ['Chickpeas, cooked (1 cup)','protein',269,14.5,'1 cup, cooked'],
 ['Lentils, cooked (1 cup)','protein',230,17.9,'1 cup, cooked'],
 ['Edamame, cooked (1 cup)','protein',188,18.5,'1 cup, cooked'],
 ['Bacon, cooked (1 slice)','protein',43,3,'1 slice, cooked'],
 ['Ham, sliced (1 oz)','protein',46,7.5,'1 oz'],
 ['Peanut butter (2 tbsp)','protein',190,7,'2 tbsp'],
 // Produce
 ['Frozen peas and carrots (1 cup)','produce',80,4,'1 cup, frozen mix',['peas and carrots (1 cup)']],
 ['Green onion (1 stalk)','produce',5,0.3,'1 stalk',['scallion (1 stalk)']],
 ['Garlic (1 clove)','produce',4.5,0.2,'1 clove',['garlic clove']],
 ['Yellow onion, chopped (1 cup)','produce',64,1.7,'1 cup, chopped'],
 ['Red onion, chopped (1 cup)','produce',64,1.7,'1 cup, chopped'],
 ['Carrot, chopped (1 cup)','produce',52,1.2,'1 cup, chopped'],
 ['Peas, cooked (1 cup)','produce',118,8,'1 cup, cooked'],
 ['Sweet corn (1 cup)','produce',132,5,'1 cup'],
 ['Broccoli, cooked (1 cup)','produce',55,3.7,'1 cup, cooked'],
 ['Bell pepper (1 medium)','produce',30,1,'1 medium pepper'],
 ['Spinach, raw (1 cup)','produce',7,0.9,'1 cup, raw'],
 ['Tomato (1 medium)','produce',22,1.1,'1 medium tomato'],
 ['Mushrooms, sliced (1 cup)','produce',15,2,'1 cup, raw sliced'],
 ['Zucchini (1 medium)','produce',33,2.4,'1 medium zucchini'],
 ['Ginger, fresh (1 tsp)','produce',2,0,'1 tsp'],
 ['Avocado (100 g)','produce',160,2,'100 g'],
 ['Banana (1 medium)','produce',105,1.3,'1 medium banana'],
 ['Apple (1 medium)','produce',95,0.5,'1 medium apple'],
 ['Strawberries (1 cup)','produce',49,1,'1 cup'],
 ['Blueberries (1 cup)','produce',85,1.1,'1 cup'],
 ['Lemon juice (1 tbsp)','produce',4,0,'1 tbsp'],
 // Dairy
 ['Whole milk (1 cup)','dairy',149,7.7,'1 cup'],
 ['2% milk (1 cup)','dairy',122,8,'1 cup'],
 ['Skim milk (1 cup)','dairy',83,8.3,'1 cup'],
 ['Heavy cream (1 tbsp)','dairy',51,0.4,'1 tbsp'],
 ['Cheddar cheese (1 oz)','dairy',115,7,'1 oz'],
 ['Mozzarella cheese (1 oz)','dairy',85,6.3,'1 oz'],
 ['Parmesan cheese (1 tbsp)','dairy',22,1.9,'1 tbsp, grated'],
 ['Plain Greek yogurt (170 g)','dairy',100,17,'170 g'],
 ['Sour cream (1 tbsp)','dairy',30,0.4,'1 tbsp'],
 ['Cream cheese (1 tbsp)','dairy',50,1,'1 tbsp'],
 // Fats & oils
 ['Butter, unsalted (1 tbsp)','fats',102,0.1,'1 tbsp',['butter (1 tbsp)','unsalted butter']],
 ['Butter, salted (1 tbsp)','fats',102,0.1,'1 tbsp',['salted butter']],
 ['Vegetable oil (1 tbsp)','fats',120,0,'1 tbsp',['vegetable oil']],
 ['Sesame oil (1 tsp)','fats',40,0,'1 tsp',['sesame oil']],
 ['Olive oil (1 tbsp)','fats',119,0,'1 tbsp',['olive oil']],
 ['Avocado oil (1 tbsp)','fats',124,0,'1 tbsp'],
 ['Canola oil (1 tbsp)','fats',124,0,'1 tbsp'],
 ['Coconut oil (1 tbsp)','fats',121,0,'1 tbsp'],
 ['Mayonnaise (1 tbsp)','fats',94,0.1,'1 tbsp'],
 // Seasonings, sauces
 ['Soy sauce (1 tbsp)','seasoning',10,1,'1 tbsp',['soy sauce']],
 ['Reduced-sodium soy sauce (1 tbsp)','seasoning',8,1,'1 tbsp'],
 ['Rice vinegar (1 tbsp)','seasoning',3,0,'1 tbsp'],
 ['Apple cider vinegar (1 tbsp)','seasoning',3,0,'1 tbsp'],
 ['Oyster sauce (1 tbsp)','seasoning',25,0.2,'1 tbsp'],
 ['Hoisin sauce (1 tbsp)','seasoning',35,0.3,'1 tbsp'],
 ['Honey (1 tbsp)','seasoning',64,0,'1 tbsp'],
 ['Granulated sugar (1 tbsp)','seasoning',49,0,'1 tbsp'],
 ['Brown sugar (1 tbsp)','seasoning',52,0,'1 tbsp'],
 ['Garlic powder (1 tsp)','seasoning',10,0.5,'1 tsp'],
 ['Onion powder (1 tsp)','seasoning',8,0.2,'1 tsp'],
 ['Paprika (1 tsp)','seasoning',6,0.3,'1 tsp'],
 ['Black pepper (1 tsp)','seasoning',6,0.2,'1 tsp'],
 ['Chili flakes (1 tsp)','seasoning',6,0.3,'1 tsp'],
 ['Sesame seeds (1 tsp)','seasoning',17,0.6,'1 tsp'],
 ['Sriracha (1 tsp)','seasoning',5,0,'1 tsp'],
 ['Ketchup (1 tbsp)','seasoning',17,0.2,'1 tbsp'],
 ['Dijon mustard (1 tsp)','seasoning',5,0.3,'1 tsp'],
 ['Table salt (1 tsp)','seasoning',0,0,'1 tsp'],
 ['Tomato sauce (1 cup)','seasoning',70,3,'1 cup'],
 // Other cooking staples
 ['Chicken broth (1 cup)','other',15,1,'1 cup'],
 ['Vegetable broth (1 cup)','other',15,1,'1 cup'],
 ['Beef broth (1 cup)','other',18,2,'1 cup'],
 ['Water (1 cup)','other',0,0,'1 cup'],
 ['Baking powder (1 tsp)','other',2,0,'1 tsp'],
 ['Baking soda (1 tsp)','other',0,0,'1 tsp']
];
const key=value=>String(value??'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
const slug=name=>name.toLocaleLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const COMMON_INGREDIENTS=Object.freeze(rows.map(([name,category,calories,protein,portion,aliases=[]])=>Object.freeze({
 id:'builtin:'+slug(name),name,kind:'food',calories,protein,
 tags:Object.freeze(['ingredient','ingredient-'+category]),
 serving:Object.freeze({amount:1,unit:'serving',text:portion,state:''}),
 aliases:Object.freeze(aliases)
})));
const byId=new Map(COMMON_INGREDIENTS.map(food=>[food.id,food]));
const byName=new Map();
for(const food of COMMON_INGREDIENTS)for(const label of [food.name,...food.aliases]){
 const candidate=key(label);if(!byName.has(candidate))byName.set(candidate,food);
}
export const commonIngredientById=id=>byId.get(id)||null;
export const findCommonIngredient=name=>byName.get(key(name))||null;
// A local override wins on the exact name. Built-ins remain read-only defaults.
export function commonIngredientChoices(saved=[]){
 const own=new Set(saved.map(food=>key(food.name)));
 return COMMON_INGREDIENTS.filter(food=>![food.name,...food.aliases].some(label=>own.has(key(label))));
}

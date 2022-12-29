(function() {
    //-------------------- 用于实现"衍生类"的方法 --------------------//

    // extend: 由于 JS 数据结构的限制，需要手写一个方法扩展"衍生类"的
    //         参数列表，如不同物体材质是 Material 的"衍生类"
    var extend = function(a) {
        for(var i = 1; i < arguments.length; i++) {
            var b = arguments[i];
            for(var c in b) {
                a[c] = b[c];
            }
        }
        return a;
    }

    //-------------------- 数学定义 --------------------//

    // vec3: 由于 JS 数据结构的限制，需要手写一个三维向量类以供使用
    var vec3 = function(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    vec3.prototype = {
        // 向量加法
        add: function(v) {
            return new vec3(this.x + v.x, this.y + v.y, this.z + v.z);
        },
        // 向量减法
        sub: function(v) {
            return new vec3(this.x - v.x, this.y - v.y, this.z - v.z);
        },
        // 向量乘法
        mul: function(v) {
            return new vec3(this.x * v.x, this.y * v.y, this.z * v.z);
        },
        // 向量除法
        div: function(v) {
            return new vec3(this.x / v.x, this.y / v.y, this.z / v.z);
        },
        // 向量自加
        iadd: function(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
        },
        // 向量数乘
        mulNum: function(num) {
            return new vec3(this.x * num, this.y * num, this.z * num);
        },
        // 向量数除
        divs: function(num) {
            return this.mulNum(1.0 / num);
        },
        // 向量点乘
        dot: function(v) {
            return this.x * v.x + this.y * v.y + this.z * v.z;
        },
        // 向量叉乘
        cross: function (v) {
          return new vec3(this.y * v.z - v.y * this.z,
              v.x * this.z - this.x * v.z,
              this.x * v.y - v.x * this.y);
        },
        // 向量单位化
        normalize: function() {
            return this.divs(Math.sqrt(this.dot(this)));
        },
        // 随机获得一个三维向量，每一维的坐标值在 0 ~ 1 之间
        getRandomVec3: function () {
            return new vec3(Math.random() * 2.5 - 1.5, Math.random() * 2.5 - 1.5, Math.random() * 2.5 - 1.5);
        },
        // 获得当前向量的长度
        length: function () {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }
    };


    // getRandomDirectionInHemisphere: 获得法向半球内的随机向量
    function getRandomDirectionInHemisphere(v){
        // 输入 v 为顶点法向量
        var randomVec3 = (new vec3(0.0, 0.0, 0.0)).getRandomVec3();
        return (randomVec3.add(v)).normalize();
    }

    //-------------------- 物体定义 --------------------//

    // Camera: 定义相机和从相机生成的射线 Ray
    var Camera = function(origin, topleft, topright, bottomleft) {
        // 模拟相机投影与成像规则，指定投影平面和视点，
        // 并根据投影平面坐标计算出视线的方向向量
        this.origin = origin;
        this.topleft = topleft;
        this.topright = topleft;
        this.bottomleft = bottomleft;

        this.xd = topright.sub(topleft);
        this.yd = bottomleft.sub(topleft);
    }
    Camera.prototype = {
        getRay: function(x, y) {
            // 射线的属性: 出发点和方向向量
            var hitPoint = this.topleft.add(this.xd.mulNum(x)).add(this.yd.mulNum(y));
            return {
                origin: this.origin,
                direction: hitPoint.sub(this.origin).normalize()
            };
        }
    };


    // Material: 定义物体的材质，由颜色和是否发光两个属性组成
    var Material = function(color, emission) {
        this.color = color;
        this.emission = emission || new vec3(0.0, 0.0, 0.0);
    }
    Material.prototype = {
        reflect: function(ray, normal) {
            // 相当于将求解渲染方程的蒙特卡洛方法从渲染函数处移动到这里进行一部分，
            // 随机选择一个法向半球内的向量作为材质反射的方向
            return getRandomDirectionInHemisphere(normal);
        }
    };

    // 材质的衍生类，定义不锈钢表面材质及其反射方程
    var Metal = function(color) {
        Material.call(this, color);
    }
    Metal.prototype = extend({}, Material.prototype, {
        reflect: function(ray, normal) {
            var randomInUnitSphere = ((new vec3(0, 0, 0)).getRandomVec3()).mulNum(0.0);
            return (ray.direction.sub(
                normal.mulNum(
                    2.0 * ray.direction.dot(normal)))).add(
                        randomInUnitSphere);
        }
    });

    // 材质的衍生类，定义透明玻璃表面材质及其反射方程
    var Glass = function(color, ior, reflection) {
        Material.call(this, color);
        this.ior = ior;
        this.reflection = reflection;
    }
    Glass.prototype = extend({}, Material.prototype, {
        reflect: function(ray, normal) {
            var theta1 = Math.abs(ray.direction.dot(normal));
            var internalIndex = 0.0;
            var externalIndex = 0.0;
            if(theta1 >= 0.0) {
                internalIndex = this.ior;
                externalIndex = 1.0;
            } else {
                internalIndex = 1.0;
                externalIndex = this.ior;
            }
            var eta = externalIndex / internalIndex;
            var theta2 = Math.sqrt(1.0 - (eta * eta) * (1.0 - (theta1 * theta1)));
            var rs = (externalIndex * theta1 - internalIndex * theta2) / (externalIndex * theta1 + internalIndex * theta2);
            var rp = (internalIndex * theta1 - externalIndex * theta2) / (internalIndex * theta1 + externalIndex * theta2);
            var reflectance = (rs * rs + rp * rp);
            // 反射
            if(Math.random() < reflectance + this.reflection) {
                return ray.direction.add(normal.mulNum(theta1*2.0));
            }
            // 折射
            return (ray.direction.add(normal.mulNum(theta1)).mulNum(eta).add(normal.mulNum(-theta2)));
        }
    });


    // Sphere: 绘制球体，属性为球心坐标和球半径
    var Sphere = function(center, radius) {
        this.center = center;
        this.radius = radius;
    };
    Sphere.prototype = {
        // 判断射线是否与球表面相交，
        // 若相交，返回交点到原点的距离
        intersect: function(ray) {
            var oc = ray.origin.sub(this.center);
            var a = ray.direction.dot(ray.direction);
            var b = oc.dot(ray.direction);
            var c = oc.dot(oc) - this.radius * this.radius;
            var discriminant = b * b - a * c;
            return (discriminant > 0) ?
                (-b - Math.sqrt(discriminant)) / a : -1;
        },
        getNormal: function(point) {
            return point.sub(this.center).normalize();
        }
    };


    var Body = function(shape, material) {
        this.shape = shape;
        this.material = material;
    }

    //-------------------- 渲染过程 --------------------//

    var Renderer = function(scene) {
        this.scene = scene;
        this.SPP = 5;
        this.buffer = [];
        for(var i = 0; i < scene.output.width*scene.output.height;i++){
            this.buffer.push(new vec3(0.0, 0.0, 0.0));
        }
    }
    Renderer.prototype = {
        clearBuffer: function() {
            for(var i = 0; i < this.buffer.length; i++) {
                this.buffer[i].x = 0.0;
                this.buffer[i].y = 0.0;
                this.buffer[i].z = 0.0;
            }
        },
        iterate: function() {
            // 渲染方程的递归求解过程
            var scene = this.scene;
            var w = scene.output.width;
            var h = scene.output.height;
            var i = 0;
            for(var y = Math.random() / h; y < 0.99999; y += 1.0 / h){
                for(var x = Math.random() / w; x < 0.99999; x += 1.0 / w){
                    // 从摄像机出发，向每个像素投射光线
                    var ray = scene.camera.getRay(x, y);
                    // 求解渲染方程
                    var color = this.pathTracing(ray, 0);
                    this.buffer[i++].iadd(color);
                }
            }
        },
        pathTracing: function(ray, n) {
            var mint = Infinity;
            if(n > this.SPP) {
                return new vec3(0.0, 0.0, 0.0);
            }

            var hit = null;
            for(var i = 0; i < this.scene.objects.length;i++){
                var o = this.scene.objects[i];
                var t = o.shape.intersect(ray);
                if(t > 0 && t <= mint) {
                    mint = t;
                    hit = o;
                }
            }

            if (hit == null) {
                return new vec3(0.0, 0.0, 0.0);
            }
            
            var point = ray.origin.add(ray.direction.mulNum(mint));
            var normal = hit.shape.getNormal(point);
            var direction = hit.material.reflect(ray, normal);
            // 如果光线会被折射，稍微将交点往里移进一点
            if(direction.dot(ray.direction) > 0.0) {
                point = ray.origin.add(ray.direction.mulNum(mint * 1.0000001));
            }
            // 否则将其移出一点，以避免一些浮点精度上带来的错误，防止自己交自己
            else {
                point = ray.origin.add(ray.direction.mulNum(mint * 0.9999999));
            }
            // 让反射出的新光线参加下一次路径追踪
            var newRay = {
                origin: point,
                direction: direction
            };
            return this.pathTracing(newRay, n+1).mul(hit.material.color).add(hit.material.emission);
        }
    }

    //-------------------- 主体函数 --------------------//

    var main = function(width, height, iterationsPerMessage, serialize) {
        var scene = {
            output: {width: width, height: height},
            // 创建相机及其视口，
            // 在标准定义的基础上适当调整了机位以获得更好的视觉效果
            camera: new Camera(
                new vec3(0.0, -0.5, -0.2),
                new vec3(-1.3, 1.0, 1.0),
                new vec3(1.3, 1.0, 1.0),
                new vec3(-1.3, 1.0, -1.0)
            ),
            // 创建物体
            objects: [
                // 玻璃球
                new Body(new Sphere(new vec3(1.0, 2.0, 0.0), 0.5), new Glass(new vec3(1.00, 1.00, 1.00), 1.6, 0.2)),
                new Body(new Sphere(new vec3(0.0, 0.9, -0.45), 0.05), new Glass(new vec3(1.00, 1.00, 1.00), 2.0, 0.2)),
                // 不锈钢球
                new Body(new Sphere(new vec3(-1.1, 2.8, 0.0), 0.5), new Metal(new vec3(0.7, 0.7, 0.7))),
                new Body(new Sphere(new vec3(0.0, 1.2, -0.3), 0.2), new Metal(new vec3(1.0, 1.0, 0.1))),
                // 普通球
                new Body(new Sphere(new vec3(-0.4, 1.0, -0.4), 0.1), new Material(new vec3(0.5, 0.5, 1.0))),
                new Body(new Sphere(new vec3(0.4, 0.8, -0.4), 0.1), new Material(new vec3(1.0, 0.1, 1.0))),
                // 发光球
                new Body(new Sphere(new vec3(-0.1, 0.5, -0.44), 0.06), new Material(new vec3(1.0, 0.5, 1.0), new vec3(1.0, 1.0, 1.0))),
                // floor
                new Body(new Sphere(new vec3(0.0, 2.0, -10e6), 10e6-0.5), new Material(new vec3(1.0, 1.0, 1.0))),
                // back
                new Body(new Sphere(new vec3(0.0, 10e6, 0.0), 10e6-4.5), new Material(new vec3(1.0, 1.0, 1.0))),
                // left
                new Body(new Sphere(new vec3(-10e6, 2.0, 0.0), 10e6-1.9), new Material(new vec3(1.0, 0.5, 0.5))),
                // right
                new Body(new Sphere(new vec3(10e6, 2.0, 0.0), 10e6-1.9), new Material(new vec3(0.5, 1.0, 0.5))),
                // top light
                new Body(new Sphere(new vec3(0.0, 2.0, 10e6), 10e6-2.5), new Material(new vec3(1.0, 1.0, 1.0), new vec3(1.0, 1.0, 1.0))),
                // front
                new Body(new Sphere(new vec3(0.0, -10e6, 0.0), 10e6-2.5), new Material(new vec3(1.0, 1.0, 1.0))),
            ]
        };
        var renderer = new Renderer(scene);
        while(true) {
            for(var x = 0; x < iterationsPerMessage; x++) {
                renderer.iterate();
            }
            postMessage(serializeBuffer(renderer.buffer, serialize));
            renderer.clearBuffer();
        }
    }

    var serializeBuffer = function(rbuffer, json) {
        var buffer = [];
        for(var i = 0; i < rbuffer.length; i++){
            buffer.push(rbuffer[i].x);
            buffer.push(rbuffer[i].y);
            buffer.push(rbuffer[i].z);
        }
        return json ? JSON.stringify(buffer) : buffer;
    }

    onmessage = function(message) {
        var data = message.data;
        var serialize = false;
        if(typeof(data) == 'string') {
            data = JSON.parse('['+data+']');
            serialize = true;
        }
        main(data[0], data[1], data[2], serialize);
    }
})();
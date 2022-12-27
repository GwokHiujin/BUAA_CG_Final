(function() {

    var extend = function(a) {
        for(var i = 1; i < arguments.length; i++) {
            var b = arguments[i];
            for(var c in b) {
                a[c] = b[c];
            }
        }
        return a;
    }

    var vec3 = function(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    vec3.prototype = {
        add: function(v) {
            return new vec3(this.x+v.x, this.y+v.y, this.z+v.z);
        },
        iadd: function(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
        },
        sub: function(v) {
            return new vec3(this.x-v.x, this.y-v.y, this.z-v.z);
        },
        mul: function(v) {
            return new vec3(this.x*v.x, this.y*v.y, this.z*v.z);
        },
        div: function(v) {
            return new vec3(this.x/v.x, this.y/v.y, this.z/v.z);
        },
        mulNum: function(s) {
            return new vec3(this.x*s, this.y*s, this.z*s);
        },
        divs: function(s) {
            return this.mulNum(1.0/s);
        },
        /* 向量点乘 */
        dot: function(v) {
            return this.x*v.x+this.y*v.y+this.z*v.z;
        },
        cross: function (v) {
          return new vec3(this.y * v.z - v.y * this.z,
              v.x * this.z - this.x * v.z,
              this.x * v.y - v.x * this.y);
        },
        normalize: function() {
            return this.divs(Math.sqrt(this.dot(this)));
        },
        getRandomVec3: function () {
            return new vec3(Math.random() * 2.5 - 1.5, Math.random() * 2.5 - 1.5, Math.random() * 2.5 - 1.5);
        },
        length: function () {
            return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
        }
    };

    function getRandomDirectionInHemisphere(v){
        /* 输入 v 为顶点法向量 */
        var randomVec3 = new vec3(0, 0, 0).getRandomVec3();
        return (randomVec3.add(v)).normalize();
    }

    var Camera = function(origin, topleft, topright, bottomleft) {
        this.origin = origin;
        this.topleft = topleft;
        this.topright = topleft;
        this.bottomleft = bottomleft;

        this.xd = topright.sub(topleft);
        this.yd = bottomleft.sub(topleft);
    }
    Camera.prototype = {
        getRay: function(x, y) {
            var hitPoint = this.topleft.add(this.xd.mulNum(x)).add(this.yd.mulNum(y));
            return {
                origin: this.origin,
                direction: hitPoint.sub(this.origin).normalize()
            };
        }
    };

    var Sphere = function(center, radius) {
        this.center = center;
        this.radius = radius;
    };
    Sphere.prototype = {
        // returns distance when ray intersects with sphere surface
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

    var Material = function(color, emission) {
        this.color = color;
        this.emission = emission || new vec3(0.0, 0.0, 0.0);
    }
    Material.prototype = {
        reflect: function(ray, normal) {
            return getRandomDirectionInHemisphere(normal);
        }
    };

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

    var Glass = function(color, ior, reflection) {
        Material.call(this, color);
        this.ior = ior;
        this.reflection = reflection;
    }
    Glass.prototype = extend({}, Material.prototype, {
        reflect: function(ray, normal) {
            var theta1 = Math.abs(ray.direction.dot(normal));
            if(theta1 >= 0.0) {
                var internalIndex = this.ior;
                var externalIndex = 1.0;
            }
            else {
                var internalIndex = 1.0;
                var externalIndex = this.ior;
            }
            var eta = externalIndex/internalIndex;
            var theta2 = Math.sqrt(1.0 - (eta * eta) * (1.0 - (theta1 * theta1)));
            var rs = (externalIndex * theta1 - internalIndex * theta2) / (externalIndex*theta1 + internalIndex * theta2);
            var rp = (internalIndex * theta1 - externalIndex * theta2) / (internalIndex*theta1 + externalIndex * theta2);
            var reflectance = (rs*rs + rp*rp);
            // reflection
            if(Math.random() < reflectance+this.reflection) {
                return ray.direction.add(normal.mulNum(theta1*2.0));
            }
            // refraction
            return (ray.direction.add(normal.mulNum(theta1)).mulNum(eta).add(normal.mulNum(-theta2)));
            //return ray.direction.mulNum(eta).sub(normal.mulNum(theta2-eta*theta1));
        }
    });

    var Body = function(shape, material) {
        this.shape = shape;
        this.material = material;
    }

    var Renderer = function(scene) {
        this.scene = scene;
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
            var scene = this.scene;
            var w = scene.output.width;
            var h = scene.output.height;
            var i = 0;
            // randomly jitter pixels so there is no aliasing
            for(var y = Math.random()/h, ystep = 1.0/h; y < 0.99999; y += ystep){
                for(var x = Math.random()/w, xstep = 1.0/w; x < 0.99999; x += xstep){
                    var ray = scene.camera.getRay(x, y);
                    var color = this.trace(ray, 0);
                    this.buffer[i++].iadd(color);
                }
            }
        },
        trace: function(ray, n) {
            var mint = Infinity;
            // trace no more than 5 reflects
            if(n > 5) {
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

            if(hit == null) {
                return new vec3(0.0, 0.0, 0.0);
            }

            var point = ray.origin.add(ray.direction.mulNum(mint));
            var normal = hit.shape.getNormal(point);
            var direction = hit.material.reflect(ray, normal);
            // if the ray is refracted move the intersection point a bit in
            if(direction.dot(ray.direction) > 0.0) {
                point = ray.origin.add(ray.direction.mulNum(mint*1.0000001));
            }
            // otherwise move it out to prevent problems with floating point
            // accuracy
            else {
                point = ray.origin.add(ray.direction.mulNum(mint*0.9999999));
            }
            var newray = {origin: point, direction: direction};
            return this.trace(newray, n+1).mul(hit.material.color).add(hit.material.emission);
        }
    }

    var main = function(width, height, iterationsPerMessage, serialize) {
        var scene = {
            output: {width: width, height: height},
            camera: new Camera(
                new vec3(0.0, -0.5, -0.2),
                new vec3(-1.3, 1.0, 1.0),
                new vec3(1.3, 1.0, 1.0),
                new vec3(-1.3, 1.0, -1.0)
            ),
            objects: [
                // glass sphere
                new Body(new Sphere(new vec3(1.0, 2.0, 0.0), 0.5), new Glass(new vec3(1.00, 1.00, 1.00), 1.6, 0.2)),
                // Metal sphere
                new Body(new Sphere(new vec3(-1.1, 2.8, 0.0), 0.5), new Metal(new vec3(0.7, 0.7, 0.7))),
                new Body(new Sphere(new vec3(0.0, 1.2, -0.3), 0.2), new Metal(new vec3(1.0, 1.0, 0.1))),
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
        }
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
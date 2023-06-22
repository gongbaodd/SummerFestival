import * as BABYLON from "@babylonjs/core";

class PlayerInput {
  _scene: BABYLON.Scene;
  inputMap: Record<string, boolean> = {};
  //simple movement
  public horizontal: number = 0;
  public vertical: number = 0;
  //tracks whether or not there is movement in that axis
  public horizontalAxis: number = 0;
  public verticalAxis: number = 0;

  //jumping and dashing
  public jumpKeyDown: boolean = false;
  public dashing: boolean = false;

  public mobileLeft: boolean;
  public mobileRight: boolean;
  public mobileUp: boolean;
  public mobileDown: boolean;
  private _mobileJump: boolean;
  private _mobileDash: boolean;

  constructor(scene: BABYLON.Scene) {
    this._scene = scene;
    this._scene.actionManager = new BABYLON.ActionManager(this._scene);
    this._scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyDownTrigger,
        (evt) => {

          console.log(evt.sourceEvent.key)
          this.inputMap[evt.sourceEvent.key] =
            evt.sourceEvent.type == "keydown";
        }
      )
    );
    this._scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyUpTrigger,
        (evt) => {
          this.inputMap[evt.sourceEvent.key] =
            evt.sourceEvent.type == "keydown";
        }
      )
    );

    //add to the scene an observable that calls updateFromKeyboard before rendering
    scene.onBeforeRenderObservable.add(() => {
      this._updateFromKeyboard();
    });
  }
  private _updateFromKeyboard() {
    if (this.inputMap["ArrowUp"] || this.mobileUp) {
      this.verticalAxis = 1;
      this.vertical = BABYLON.Scalar.Lerp(this.vertical, 1, 0.2);
    } else if (this.inputMap["ArrowDown"] || this.mobileDown) {
      this.vertical = BABYLON.Scalar.Lerp(this.vertical, -1, 0.2);
      this.verticalAxis = -1;
    } else {
      this.vertical = 0;
      this.verticalAxis = 0;
    }

    //left - right movement
    if (this.inputMap["ArrowLeft"]) {
      //lerp will create a scalar linearly interpolated amt between start and end scalar
      //taking current horizontal and how long you hold, will go up to -1(all the way left)
      this.horizontal = BABYLON.Scalar.Lerp(this.horizontal, -1, 0.2);
      this.horizontalAxis = -1;
    } else if (this.inputMap["ArrowRight"]) {
      this.horizontal = BABYLON.Scalar.Lerp(this.horizontal, 1, 0.2);
      this.horizontalAxis = 1;
    } else {
      this.horizontal = 0;
      this.horizontalAxis = 0;
    }

    //dash
    if (this.inputMap["Shift"]) {
      this.dashing = true;
    } else {
      this.dashing = false;
    }

    //Jump Checks (SPACE)
    if (this.inputMap[" "]) {
      this.jumpKeyDown = true;
    } else {
      this.jumpKeyDown = false;
    }
  }
}

class Player extends BABYLON.TransformNode {
  public camera: BABYLON.UniversalCamera;
  public scene: BABYLON.Scene;
  private _input: PlayerInput;

  //Player
  public mesh: BABYLON.Mesh; //outer collisionbox of player

  //Camera
  private _camRoot: BABYLON.TransformNode;
  private _yTilt: BABYLON.TransformNode;

  // animation trackers
  private _isFalling: boolean = false;
  private _jumped: boolean = false;

  //const values
  private static readonly PLAYER_SPEED: number = 0.45;
  private static readonly JUMP_FORCE: number = 0.8;
  private static readonly GRAVITY: number = -2.8;
  private static readonly DASH_FACTOR: number = 2.5;
  private static readonly DASH_TIME: number = 10; //how many frames the dash lasts
  private static readonly DOWN_TILT: BABYLON.Vector3 = new BABYLON.Vector3(
    0.8290313946973066,
    0,
    0
  );
  private static readonly ORIGINAL_TILT: BABYLON.Vector3 = new BABYLON.Vector3(
    0.5934119456780721,
    0,
    0
  );
  public dashTime: number = 0;

  //player movement vars
  private _deltaTime: number = 0;
  private _h: number;
  private _v: number;

  private _moveDirection: BABYLON.Vector3 = new BABYLON.Vector3();
  private _inputAmt: number;

  //dashing
  private _dashPressed: boolean;
  private _canDash: boolean = true;

  //gravity, ground detection, jumping
  private _gravity: BABYLON.Vector3 = new BABYLON.Vector3();
  private _lastGroundPos: BABYLON.Vector3 = BABYLON.Vector3.Zero(); // keep track of the last grounded position
  private _grounded: boolean;
  private _jumpCount: number = 1;

  constructor(
    scene: BABYLON.Scene,
    shadowGenerator: BABYLON.ShadowGenerator,
    input: PlayerInput
  ) {
    super("player", scene);
    this.scene = scene;
    this.setUp();
    this._setupPlayerCamera();
    this._input = input;
  }

  private setUp() {
    const scene = this.scene;
    const { MeshBuilder, StandardMaterial, Color3, Matrix, Vector3, Quaternion } = BABYLON;
    
    const ground = MeshBuilder.CreateBox("ground", { size: 24 }, scene)
    ground.scaling = new Vector3(1, .02, 1)

    const envLight = new BABYLON.HemisphericLight(
        "envLight",
        new Vector3(0, 1, 0),
        scene
    )

    const sparklight = new BABYLON.PointLight("sparklight", new Vector3(0, 1, 0), scene)
    sparklight.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825)
    
    
    const outer = MeshBuilder.CreateBox(
        "player",
        { width: 2, depth: 1, height: 3 },
        scene
    );
    outer.isVisible = false;
    outer.isPickable = false;
    outer.checkCollisions = true;

    outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

    outer.ellipsoid = new Vector3(1, 1.5, 1);
    outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

    outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

    this.mesh = outer;

    const body = MeshBuilder.CreateCylinder(
        "body",
        {
            height: 3,
            diameterTop: 2,
            diameterBottom: 2,
            tessellation: 0,
            subdivisions: 0,
        },
        scene
    );
    const material = new StandardMaterial("ref", scene);
    material.diffuseColor = new Color3(0.8, 0.5, 0.5);

    body.material = material;
    body.isPickable = false;
    body.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

    body.parent = outer;

    const box = MeshBuilder.CreateBox(
        "inner",
        { width: 0.5, depth: 0.5, height: 0.25 },
        scene
    );

    box.parent = body

  }

  //--GROUND DETECTION--
  //Send raycast to the floor to detect if there are any hits with meshes below the character
  private _floorRaycast(offsetx: number, offsetz: number, raycastlen: number) {
    const { Vector3, Ray } = BABYLON;
    //position the raycast from bottom center of mesh
    let raycastFloorPos = new Vector3(
      this.mesh.position.x + offsetx,
      this.mesh.position.y + 0.5,
      this.mesh.position.z + offsetz
    );
    let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1), raycastlen);

    //defined which type of meshes should be pickable
    let predicate = function (mesh) {
      return mesh.isPickable && mesh.isEnabled();
    };

    let pick = this.scene.pickWithRay(ray, predicate);

    if (pick.hit) {
      //grounded
      return pick.pickedPoint;
    } else {
      //not grounded
      return Vector3.Zero();
    }
  }

  private _isGrounded(): boolean {
    const { Vector3 } = BABYLON;
    if (this._floorRaycast(0, 0, 0.6).equals(Vector3.Zero())) {
      return false;
    } else {
      return true;
    }
  }

  //https://www.babylonjs-playground.com/#FUK3S#8
  //https://www.html5gamedevs.com/topic/7709-scenepick-a-mesh-that-is-enabled-but-not-visible/
  //check whether a mesh is sloping based on the normal
  private _checkSlope(): boolean {
    const { Vector3, Ray } = BABYLON;

    //only check meshes that are pickable and enabled (specific for collision meshes that are invisible)
    let predicate = function (mesh) {
      return mesh.isPickable && mesh.isEnabled();
    };

    //4 raycasts outward from center
    let raycast = new Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 0.5,
      this.mesh.position.z + 0.25
    );
    let ray = new Ray(raycast, Vector3.Up().scale(-1), 1.5);
    let pick = this.scene.pickWithRay(ray, predicate);

    let raycast2 = new Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 0.5,
      this.mesh.position.z - 0.25
    );
    let ray2 = new Ray(raycast2, Vector3.Up().scale(-1), 1.5);
    let pick2 = this.scene.pickWithRay(ray2, predicate);

    let raycast3 = new Vector3(
      this.mesh.position.x + 0.25,
      this.mesh.position.y + 0.5,
      this.mesh.position.z
    );
    let ray3 = new Ray(raycast3, Vector3.Up().scale(-1), 1.5);
    let pick3 = this.scene.pickWithRay(ray3, predicate);

    let raycast4 = new Vector3(
      this.mesh.position.x - 0.25,
      this.mesh.position.y + 0.5,
      this.mesh.position.z
    );
    let ray4 = new Ray(raycast4, Vector3.Up().scale(-1), 1.5);
    let pick4 = this.scene.pickWithRay(ray4, predicate);

    if (pick.hit && !pick.getNormal().equals(Vector3.Up())) {
      if (pick.pickedMesh.name.includes("stair")) {
        return true;
      }
    } else if (pick2.hit && !pick2.getNormal().equals(Vector3.Up())) {
      if (pick2.pickedMesh.name.includes("stair")) {
        return true;
      }
    } else if (pick3.hit && !pick3.getNormal().equals(Vector3.Up())) {
      if (pick3.pickedMesh.name.includes("stair")) {
        return true;
      }
    } else if (pick4.hit && !pick4.getNormal().equals(Vector3.Up())) {
      if (pick4.pickedMesh.name.includes("stair")) {
        return true;
      }
    }
    return false;
  }

  public activatePlayerCamera() {
    this.scene.registerBeforeRender(() => {
      this._beforeRenderUpdate();
      this._updateCamera();
    });
    return this.camera;
  }

  private _updateFromControls() {
    const { Vector3, Quaternion } = BABYLON;

    this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

    this._moveDirection = Vector3.Zero();
    this._h = this._input.horizontal; //right, x
    this._v = this._input.vertical; //fwd, z

    //--DASHING--
    //limit dash to once per ground/platform touch
    //can only dash when in the air
    if (
      this._input.dashing &&
      !this._dashPressed &&
      this._canDash &&
      !this._grounded
    ) {
      this._canDash = false;
      this._dashPressed = true;
    }

    let dashFactor = 1;
    //if you're dashing, scale movement
    if (this._dashPressed) {
      if (this.dashTime > Player.DASH_TIME) {
        this.dashTime = 0;
        this._dashPressed = false;
      } else {
        dashFactor = Player.DASH_FACTOR;
      }
      this.dashTime++;
    }

    //--MOVEMENTS BASED ON CAMERA (as it rotates)--
    let fwd = this._camRoot.forward;
    let right = this._camRoot.right;
    let correctedVertical = fwd.scaleInPlace(this._v);
    let correctedHorizontal = right.scaleInPlace(this._h);

    //movement based off of camera's view
    let move = correctedHorizontal.addInPlace(correctedVertical);

    //clear y so that the character doesnt fly up, normalize for next step, taking into account whether we've DASHED or not
    this._moveDirection = new Vector3(
      move.normalize().x * dashFactor,
      0,
      move.normalize().z * dashFactor
    );

    //clamp the input value so that diagonal movement isn't twice as fast
    let inputMag = Math.abs(this._h) + Math.abs(this._v);
    if (inputMag < 0) {
      this._inputAmt = 0;
    } else if (inputMag > 1) {
      this._inputAmt = 1;
    } else {
      this._inputAmt = inputMag;
    }
    //final movement that takes into consideration the inputs
    this._moveDirection = this._moveDirection.scaleInPlace(
      this._inputAmt * Player.PLAYER_SPEED
    );

    //check if there is movement to determine if rotation is needed
    let input = new Vector3(
      this._input.horizontalAxis,
      0,
      this._input.verticalAxis
    ); //along which axis is the direction
    if (input.length() == 0) {
      //if there's no input detected, prevent rotation and keep player in same rotation
      return;
    }

    //rotation based on input & the camera angle
    let angle = Math.atan2(
      this._input.horizontalAxis,
      this._input.verticalAxis
    );
    angle += this._camRoot.rotation.y;
    let targ = Quaternion.FromEulerAngles(0, angle, 0);
    this.mesh.rotationQuaternion = Quaternion.Slerp(
      this.mesh.rotationQuaternion,
      targ,
      10 * this._deltaTime
    );
  }

  private _updateGroundDetection() {
    const { Vector3 } = BABYLON;

    this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

    //if not grounded
    if (!this._isGrounded()) {
      //if the body isnt grounded, check if it's on a slope and was either falling or walking onto it
      if (this._checkSlope() && this._gravity.y <= 0) {
        console.log("slope");
        //if you are considered on a slope, you're able to jump and gravity wont affect you
        this._gravity.y = 0;
        this._jumpCount = 1;
        this._grounded = true;
      } else {
        //keep applying gravity
        this._gravity = this._gravity.addInPlace(
          Vector3.Up().scale(this._deltaTime * Player.GRAVITY)
        );
        this._grounded = false;
      }
    }

    //limit the speed of gravity to the negative of the jump power
    if (this._gravity.y < -Player.JUMP_FORCE) {
      this._gravity.y = -Player.JUMP_FORCE;
    }

    //cue falling animation once gravity starts pushing down
    if (this._gravity.y < 0 && this._jumped) {
      //todo: play a falling anim if not grounded BUT not on a slope
      this._isFalling = true;
    }

    //update our movement to account for jumping
    this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));

    if (this._isGrounded()) {
      this._gravity.y = 0;
      this._grounded = true;
      //keep track of last known ground position
      this._lastGroundPos.copyFrom(this.mesh.position);

      this._jumpCount = 1;
      //dashing reset
      this._canDash = true;
      //reset sequence(needed if we collide with the ground BEFORE actually completing the dash duration)
      this.dashTime = 0;
      this._dashPressed = false;

      //jump & falling animation flags
      this._jumped = false;
      this._isFalling = false;
    }

    //Jump detection
    if (this._input.jumpKeyDown && this._jumpCount > 0) {
      this._gravity.y = Player.JUMP_FORCE;
      this._jumpCount--;
    }
  }

  private _beforeRenderUpdate() {
    this._updateFromControls();
    this._updateGroundDetection();
  }

  private _updateCamera() {}

  private _setupPlayerCamera() {
    const { TransformNode, Vector3, UniversalCamera } = BABYLON;
    //root camera parent that handles positioning of the camera to follow the player
    this._camRoot = new TransformNode("root");
    this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
    //to face the player from behind (180 degrees)
    this._camRoot.rotation = new Vector3(0, Math.PI, 0);

    //rotations along the x-axis (up/down tilting)
    let yTilt = new TransformNode("ytilt");
    //adjustments to camera view to point down at our player
    yTilt.rotation = Player.ORIGINAL_TILT;
    this._yTilt = yTilt;
    yTilt.parent = this._camRoot;

    //our actual camera that's pointing at our root's position
    this.camera = new UniversalCamera(
      "cam",
      new Vector3(0, 0, -30),
      this.scene
    );
    this.camera.lockedTarget = this._camRoot.position;
    this.camera.fov = 0.47350045992678597;
    this.camera.parent = yTilt;

    this.scene.activeCamera = this.camera;
    return this.camera;
  }
}

class App {
  _canvas: HTMLCanvasElement;
  _engine: BABYLON.Engine;
  _scene: BABYLON.Scene;
  _input: PlayerInput;
  _player: Player;
  constructor() {
    this._canvas = this.createCanvas();
    this.init();
  }

  private createCanvas() {
    //Commented out for development
    document.documentElement.style["overflow"] = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    //create the canvas html element and attach it to the webpage
    this._canvas = document.createElement("canvas");
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._canvas.id = "gameCanvas";
    document.body.appendChild(this._canvas);

    return this._canvas;
  }

  private async _initializeGameAsync(scene: BABYLON.Scene) {
    const Color3 = BABYLON.Color3;
    const Color4 = BABYLON.Color4;
    const Vector3 = BABYLON.Vector3;
    const PointLight = BABYLON.PointLight;
    const ShadowGenerator = BABYLON.ShadowGenerator;

    scene.ambientColor = new Color3(
      0.34509803921568627,
      0.5568627450980392,
      0.8352941176470589
    );
    scene.clearColor = new Color4(
      0.01568627450980392,
      0.01568627450980392,
      0.20392156862745098
    );

    const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
    light.diffuse = new Color3(
      0.08627450980392157,
      0.10980392156862745,
      0.15294117647058825
    );
    light.intensity = 35;
    light.radius = 1;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    this._player = new Player(scene, shadowGenerator, this._input);
    const camera = this._player.activatePlayerCamera();
  }

  private async init() {
    this._engine = new BABYLON.Engine(this._canvas, true);
    this._scene = new BABYLON.Scene(this._engine);
    this._input = new PlayerInput(this._scene);

    await this._initializeGameAsync(this._scene);

    this._scene.debugLayer.show();
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });
  }
}

new App();

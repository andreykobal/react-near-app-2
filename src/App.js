import 'regenerator-runtime/runtime'
import React, { Fragment, useEffect, useState } from 'react'
import { login, logout } from './utils'
import './global.css'
import Unity, { UnityContext } from "react-unity-webgl";

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')

const unityContext = new UnityContext({
  loaderUrl: "build/myunityapp.loader.js",
  dataUrl: "build/myunityapp.data",
  frameworkUrl: "build/myunityapp.framework.js",
  codeUrl: "build/myunityapp.wasm",
});

function handleOnClickFullscreen() {
  unityContext.setFullscreen(true);
}

export default function App() {
  
  const [isUnityMounted, setIsUnityMounted] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(30);
  const [cubeRotation, setCubeRotation] = useState(0);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [saidMessage, setSaidMessage] = useState("Nothing");
  const [isLoaded, setIsLoaded] = useState(false);
  const [progression, setProgression] = useState(0);


  // use React Hooks to store greeting in component state
  const [greeting, set_greeting] = React.useState()

  // when the user has not yet interacted with the form, disable the button
  const [buttonDisabled, setButtonDisabled] = React.useState(true)

  // after submitting the form, we want to show Notification
  const [showNotification, setShowNotification] = React.useState(false)

  // The useEffect hook can be used to fire side-effects during render
  // Learn more: https://reactjs.org/docs/hooks-intro.html
  useEffect(() => {
    unityContext.on("canvas", handleOnUnityCanvas);
    unityContext.on("progress", handleOnUnityProgress);
    unityContext.on("loaded", handleOnUnityLoaded);
    unityContext.on("RotationDidUpdate", handleOnUnityRotationDidUpdate);
    unityContext.on("ClickedPosition", handleOnUnityClickedPosition);
    unityContext.on("Say", handleOnUnitySayMessage);
    // When the component is unmounted, we'll unregister the event listener.
    return function () {
      unityContext.removeAllEventListeners();
    };
  }, []);

    // When the rotation speed has been updated, it will be sent to Unity.
    useEffect(() => {
      unityContext.send("MeshCrate", "SetRotationSpeed", rotationSpeed);
    }, [rotationSpeed]);
  
    // Built-in event invoked when the Unity canvas is ready to be interacted with.
    function handleOnUnityCanvas(canvas) {
      canvas.setAttribute("role", "unityCanvas");
    }
  
    // Built-in event invoked when the Unity app's progress has changed.
    function handleOnUnityProgress(progression) {
      setProgression(progression);
    }
  
    // Built-in event invoked when the Unity app is loaded.
    function handleOnUnityLoaded() {
      setIsLoaded(true);
    }
  
    // Custom event invoked when the Unity app sends a message indicating that the
    // rotation has changed.
    function handleOnUnityRotationDidUpdate(degrees) {
      setCubeRotation(Math.round(degrees));
    }
  
    // Custom event invoked when the Unity app sends a message indicating that the
    // mouse click position has changed.
    function handleOnUnityClickedPosition(x, y) {
      setClickPosition({ x, y });
    }
  
    // Custom event invoked when the Unity app sends a message including something
    // it said.
    function handleOnUnitySayMessage(message) {
      setSaidMessage(message);

      const newGreeting = 'Hello Smart Contract From ' + window.accountId

      window.contract.set_greeting({
        // pass the value that the user entered in the greeting field
        message: newGreeting
      })
                // update local `greeting` variable to match persisted value
                set_greeting(newGreeting)

                // show Notification
                setShowNotification(true)
      
                // remove Notification again after css animation completes
                // this allows it to be shown again next time the form is submitted
                setTimeout(() => {
                  setShowNotification(false)
                }, 11000)
    }
  
    // Event invoked when the user clicks the button, the speed will be increased.
    function handleOnClickIncreaseSpeed() {
      setRotationSpeed(rotationSpeed + 15);
    }
  
    // Event invoked when the user clicks the button, the speed will be decreased.
    function handleOnClickDecreaseSpeed() {
      setRotationSpeed(rotationSpeed - 15);
    }
  
    // Event invoked when the user clicks the button, the unity container will be
    // mounted or unmounted depending on the current mounting state.
    function handleOnClickUnMountUnity() {
      if (isLoaded === true) {
        setIsLoaded(false);
      }
      setIsUnityMounted(isUnityMounted === false);
    }

  
  
  React.useEffect(
    () => {
      // in this case, we only care to query the contract when signed in
      if (window.walletConnection.isSignedIn()) {

        // window.contract is set by initContract in index.js
        window.contract.get_greeting({ account_id: window.accountId })
          .then(greetingFromContract => {
            set_greeting(greetingFromContract)
          })
      }
    },

    // The second argument to useEffect tells React when to re-run the effect
    // Use an empty array to specify "only run on first render"
    // This works because signing into NEAR Wallet reloads the page
    []
  )

  // if not signed in, return early with sign-in prompt
  if (!window.walletConnection.isSignedIn()) {
    return (
      <main>
        <h2>Welcome to NEAR metaverse 3D game! It's time to make some changes</h2>
        <p>
          Go ahead and click the button below to try it out:
        </p>
        <p style={{ textAlign: 'center', marginTop: '2.5em' }}>
          <button onClick={login}>Sign in</button>
        </p>
      </main>
    )
  }

  return (
    // use React Fragment, <>, to avoid wrapping elements in unnecessary divs
    <>
      <button className="link" style={{ float: 'right' }} onClick={logout}>
        Sign out
      </button>
      <main>
        <h2>
          <label
            htmlFor="greeting"
            style={{
              color: 'var(--secondary)',
              borderBottom: '2px solid var(--secondary)'
            }}
          >
            {greeting}
          </label>
          {' '/* React trims whitespace around tags; insert literal space character when needed */}
          {window.accountId}!
        </h2>
        {/* <form onSubmit={async event => {
          event.preventDefault()

          // get elements from the form using their id attribute
          const { fieldset, greeting } = event.target.elements

          // hold onto new user-entered value from React's SynthenticEvent for use after `await` call
          const newGreeting = greeting.value

          // disable the form while the value gets updated on-chain
          fieldset.disabled = true

          try {
            // make an update call to the smart contract
            await window.contract.set_greeting({
              // pass the value that the user entered in the greeting field
              message: newGreeting
            })
          } catch (e) {
            alert(
              'Something went wrong! ' +
              'Maybe you need to sign out and back in? ' +
              'Check your browser console for more info.'
            )
            throw e
          } finally {
            // re-enable the form, whether the call succeeded or failed
            fieldset.disabled = false
          }

          // update local `greeting` variable to match persisted value
          set_greeting(newGreeting)

          // show Notification
          setShowNotification(true)

          // remove Notification again after css animation completes
          // this allows it to be shown again next time the form is submitted
          setTimeout(() => {
            setShowNotification(false)
          }, 11000)
        }}>
          <fieldset id="fieldset">
            <label
              htmlFor="greeting"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em'
              }}
            >
              Change greeting
            </label>
            <div style={{ display: 'flex' }}>
              <input
                autoComplete="off"
                defaultValue={greeting}
                id="greeting"
                onChange={e => setButtonDisabled(e.target.value === greeting)}
                style={{ flex: 1 }}
              />
              <button
                disabled={buttonDisabled}
                style={{ borderRadius: '0 5px 5px 0' }}
              >
                Save
              </button>
            </div>
          </fieldset>
        </form> */}

        
      <Fragment>
      <div className="wrapper">
        {/* Some buttons to interact */}
        <button onClick={() => handleOnClickFullscreen()}>Fullscreen</button>
        <button onClick={handleOnClickUnMountUnity}>(Un)mount Unity</button>
        <button onClick={handleOnClickIncreaseSpeed}>Increase speed</button>
        <button onClick={handleOnClickDecreaseSpeed}>Decrease speed</button>
        {/* The Unity container */}
        {isUnityMounted === true && (
          <Fragment>
            <div className="unity-container">
              {/* The loading screen will be displayed here. */}
              {isLoaded === false && (
                <div className="loading-overlay">
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: progression * 100 + "%" }}
                    />
                  </div>
                </div>
              )}
              {/* The Unity app will be rendered here. */}
              <Unity className="unity-canvas" unityContext={unityContext} />
            </div>
            {/* Displaying some output values */}
            <p>
              The cube is rotated <b>{cubeRotation}</b> degrees
              <br />
              The Unity app said <b>"{saidMessage}"</b>!
              <br />
              Clicked at <b>x{clickPosition.x}</b>, <b>y{clickPosition.y}</b>
            </p>
          </Fragment>
        )}
        <h6>
          Made with love by{" "}
          <a href="https://github.com/jeffreylanters">Jeffrey Lanters</a>
        </h6>
      </div>
    </Fragment> 
      </main>
      {showNotification && <Notification />}
    </>
  )
}

// this component gets rendered by App after the form is submitted
function Notification() {
  const urlPrefix = `https://explorer.${networkId}.near.org/accounts`
  return (
    <aside>
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.accountId}`}>
        {window.accountId}
      </a>
      {' '/* React trims whitespace around tags; insert literal space character when needed */}
      called method: 'set_greeting' in contract:
      {' '}
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.contract.contractId}`}>
        {window.contract.contractId}
      </a>
      <footer>
        <div>✔ Succeeded</div>
        <div>Just now</div>
      </footer>
    </aside>
  )
}

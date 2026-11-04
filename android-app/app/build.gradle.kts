plugins { id("com.android.application") }
android { namespace = "com.laizongai.p5"; compileSdk = 35
 defaultConfig { applicationId = "com.laizongai.p5"; minSdk = 24; targetSdk = 35; versionCode = 2; versionName = "1.1.0" }
 signingConfigs {
   create("production") {
     System.getenv("GSZW_ANDROID_KEYSTORE_PATH")?.takeIf { it.isNotBlank() }?.let {
       storeFile = file(it)
       storePassword = System.getenv("GSZW_ANDROID_STORE_PASSWORD")
       keyAlias = System.getenv("GSZW_ANDROID_KEY_ALIAS")
       keyPassword = System.getenv("GSZW_ANDROID_KEY_PASSWORD")
     }
   }
 }
 buildTypes {
   release {
     isMinifyEnabled = false
     if (!System.getenv("GSZW_ANDROID_KEYSTORE_PATH").isNullOrBlank()) signingConfig = signingConfigs.getByName("production")
   }
 }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}

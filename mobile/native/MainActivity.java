package app.brainboost.mobile;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLException;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** A small native startup/retry screen; the existing website owns all application screens. */
public class MainActivity extends Activity {
    private final Handler handler = new Handler();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private LinearLayout panel;
    private TextView title, subtitle;
    private Button retry;
    private ProgressBar progress;
    private Uri requestedUrl;
    private boolean loading, websiteOpened, awaitingReturn;
    private long lastBack;
    private int generation;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(7,11,26));
        getWindow().setNavigationBarColor(Color.rgb(7,11,26));
        getWindow().getDecorView().setSystemUiVisibility(0);
        requestedUrl = trustedUrl(getIntent().getData());
        buildScreen();
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        if (state != null && state.getBoolean("websiteOpened")) {
            websiteOpened = true;
            showReturnScreen();
        } else {
            ImageView logo = (ImageView) panel.getChildAt(0);
            logo.setScaleX(.90f); logo.setScaleY(.90f); logo.setAlpha(.2f);
            logo.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(450).start();
            handler.postDelayed(this::checkAndLaunch, 500);
        }
    }

    private Uri trustedUrl(Uri candidate) {
        if (candidate != null && "https".equals(candidate.getScheme()) &&
            "backboost-skill1.vercel.app".equals(candidate.getHost()) &&
            candidate.getUserInfo() == null && (candidate.getPort() == -1 || candidate.getPort() == 443)) return candidate;
        return Uri.parse("https://backboost-skill1.vercel.app/?android_app=1");
    }

    private void buildScreen() {
        panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER); panel.setPadding(dp(28),dp(32),dp(28),dp(32));
        panel.setBackgroundColor(Color.rgb(7,11,26)); setContentView(panel);
        if (Build.VERSION.SDK_INT >= 30) panel.setOnApplyWindowInsetsListener((view,insets) -> {
            android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            view.setPadding(dp(28)+safe.left,dp(32)+safe.top,dp(28)+safe.right,dp(32)+safe.bottom); return insets;
        });
        else panel.setFitsSystemWindows(true);
        ImageView logo = new ImageView(this); logo.setImageResource(R.drawable.splash);
        logo.setContentDescription("Brain Boost"); panel.addView(logo,new LinearLayout.LayoutParams(dp(112),dp(112)));
        title = new TextView(this); title.setTextColor(Color.WHITE); title.setTextSize(24);
        title.setTypeface(null,Typeface.BOLD); title.setGravity(Gravity.CENTER); panel.addView(title);
        subtitle = new TextView(this); subtitle.setTextColor(Color.rgb(203,213,225)); subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER); subtitle.setPadding(0,dp(12),0,dp(24)); panel.addView(subtitle);
        progress = new ProgressBar(this); panel.addView(progress,new LinearLayout.LayoutParams(dp(40),dp(40)));
        retry = new Button(this); retry.setText("Retry"); retry.setAllCaps(false); retry.setTextColor(Color.WHITE);
        GradientDrawable buttonBackground = new GradientDrawable();buttonBackground.setColor(Color.rgb(124,58,237));buttonBackground.setCornerRadius(dp(14));retry.setBackground(buttonBackground);
        LinearLayout.LayoutParams buttonLayout = new LinearLayout.LayoutParams(dp(220),dp(52));buttonLayout.topMargin=dp(16);panel.addView(retry,buttonLayout);retry.setOnClickListener(v->checkAndLaunch());
        title.setText("Brain Boost"); subtitle.setText("Opening your learning workspace…"); retry.setVisibility(View.GONE);
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private boolean connected(){
        ConnectivityManager manager=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        if(manager==null)return false;
        Network network=manager.getActiveNetwork();NetworkCapabilities capabilities=network==null?null:manager.getNetworkCapabilities(network);
        return capabilities!=null&&capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }
    private void checkAndLaunch(){
        if(loading||isFinishing())return;
        if(!connected()){showError("No Internet Connection","Check your Wi-Fi or mobile data, then tap Retry.");return;}
        loading=true;int request=++generation;progress.setVisibility(View.VISIBLE);retry.setVisibility(View.GONE);
        title.setText("Brain Boost");subtitle.setText("Connecting securely…");
        worker.execute(()->{
            String problem=null;HttpsURLConnection connection=null;
            try{
                connection=(HttpsURLConnection)new URL("https://backboost-skill1.vercel.app/").openConnection();
                connection.setRequestMethod("HEAD");connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
                int status=connection.getResponseCode();
                if(status>=400||status<200||status>=300)problem="Brain Boost is temporarily unavailable. Please try again shortly.";
            }catch(SSLException e){problem="A secure connection could not be verified. Please check your device date and try again.";}
            catch(Exception e){problem="The connection took too long or could not reach Brain Boost. Please retry.";}
            finally{if(connection!=null)connection.disconnect();}
            final String error=problem;
            runOnUiThread(()->{if(request!=generation||isFinishing()||isDestroyed())return;loading=false;
                if(error!=null){showError("Unable to connect",error);return;}
                Intent intent=new Intent(this,LauncherActivity.class);intent.setData(requestedUrl);
                try{websiteOpened=true;awaitingReturn=true;startActivityForResult(intent,10);}
                catch(Exception e){awaitingReturn=false;showError("Unable to open Brain Boost","Install or update Google Chrome, then tap Retry.");}
            });
        });
    }
    private void showError(String heading,String body){loading=false;title.setText(heading);subtitle.setText(body);progress.setVisibility(View.GONE);retry.setText("Retry");retry.setVisibility(View.VISIBLE);}
    private void showReturnScreen(){title.setText("Brain Boost");subtitle.setText("Press Back again to exit, or continue learning.");progress.setVisibility(View.GONE);retry.setText("Continue");retry.setVisibility(View.VISIBLE);lastBack=System.currentTimeMillis();}
    @Override protected void onResume(){super.onResume();if(websiteOpened&&!loading)showReturnScreen();}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==10){awaitingReturn=false;showReturnScreen();}}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);requestedUrl=trustedUrl(intent.getData());checkAndLaunch();}
    @Override public void onBackPressed(){handleBack();}
    private void handleBack(){if(System.currentTimeMillis()-lastBack<2500){finish();return;}lastBack=System.currentTimeMillis();Toast.makeText(this,"Press Back again to exit",Toast.LENGTH_SHORT).show();}
    @Override protected void onSaveInstanceState(Bundle state){state.putBoolean("websiteOpened",websiteOpened);super.onSaveInstanceState(state);}
    @Override public void onConfigurationChanged(Configuration config){super.onConfigurationChanged(config);panel.requestApplyInsets();}
    @Override protected void onDestroy(){generation++;handler.removeCallbacksAndMessages(null);worker.shutdownNow();super.onDestroy();}
}

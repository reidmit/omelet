<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'vendor/autoload.php';

$loader = new Twig_Loader_Filesystem('views');
$twig = new Twig_Environment($loader, array(
    'debug' => true
));
$twig->addExtension(new Twig_Extension_Debug());

try {
    echo $twig->render('index.html', array('name' => 'Reid Mitchell'));
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
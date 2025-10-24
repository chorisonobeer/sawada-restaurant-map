import React from "react";
import { FaTwitter, FaInstagram, FaHome, FaFacebook } from 'react-icons/fa';

import './Links.scss'

type Props = {
  data: Pwamap.ShopData;
};

const noop = (e: React.MouseEvent) => {
  e.stopPropagation()
}

const Content = (props: Props) => {

  return (
    <div className="links">
      {props.data['Instagram']?<div className="link"><a href={props.data['Instagram'].startsWith('http') ? props.data['Instagram'] : `https://instagram.com/${props.data['Instagram']}`} target="_blank" rel="noopener noreferrer"><FaInstagram onClick={noop} size="20px" /></a></div>:''}
      {props.data['Twitter']?<div className="link"><a href={props.data['Twitter'].startsWith('http') ? props.data['Twitter'] : `https://twitter.com/${props.data['Twitter']}`} target="_blank" rel="noopener noreferrer"><FaTwitter onClick={noop} size="20px" /></a></div>:''}
      {props.data['Facebook']?<div className="link"><a href={props.data['Facebook'].startsWith('http') ? props.data['Facebook'] : `https://www.facebook.com/${props.data['Facebook']}`} target="_blank" rel="noopener noreferrer"><FaFacebook onClick={noop} size="20px" /></a></div>:''}
      {props.data['公式サイト']?<div className="link"><a href={props.data['公式サイト']} target="_blank" rel="noopener noreferrer"><FaHome onClick={noop} size="20px" /></a></div>:''}
    </div>
  );
};

export default Content;

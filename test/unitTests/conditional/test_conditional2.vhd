entity test_conditional2 is
end entity;
architecture arch of test_conditional2 is
begin
  `if VALUE5 > "5" then
    `error "FALSE"
  `end if
  `if VALUE5 > "4" then
    `error "TRUE"
  `end if
  `if VALUE5 > "6" then
    `error "FALSE"
  `end if
  `if VALUE5 >= "5" then
    `error "TRUE"
  `end if
  `if VALUE5 < "5" then
    `error "FALSE"
  `end if
  `if VALUE5 < "6" then
    `error "TRUE"
  `end if
  `if VALUE5 <= "5" then
    `error "TRUE"
  `end if
  `if not (VALUE5 <= "5") then
    `error "FALSE"
  `end if

  `if VALUE5 > "5" xor VALUE5 < "5" then
    `error "FALSE"
  `end if

  `if VALUE5 > "5" or VALUE5 < "5" then
    `error "FALSE"
  `end if
  `if VALUE5 = "5" xor VALUE5 /= "5" then
    `error "TRUE"
  `end if
  `if VALUE5 = "5" xnor VALUE5 /= "5" then
    `error "FALSE"
  `end if
  `if VALUE5 = "6" or (VALUE5 = "5" AND VALUE5 = "6") then
    `error "FALSE"
  `end if
  `if VALUE5 = "6" or (VALUE5 = "5" xor VALUE5 = "6") then
    `error "TRUE"
  `end if
end architecture;
entity semicolon_parameter_list is
  procedure dummy (
    dummy : in integer;
    )
  is
  begin
    report integer'image(dummy);
  end procedure;
begin
end entity;
